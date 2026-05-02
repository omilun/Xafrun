// Package api provides the HTTP handlers for the Xafrun backend.
package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/kubernetes"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/yaml"

	"github.com/omilun/xafrun/pkg/models"
	"github.com/omilun/xafrun/pkg/watcher"
)

type Handler struct {
	Watcher   *watcher.Watcher
	Client    client.Client
	Clientset kubernetes.Interface
	Discovery discovery.DiscoveryInterface
}

// GET /api/tree — returns the current graph snapshot.
func (h *Handler) GetTree(c *gin.Context) {
	c.JSON(http.StatusOK, h.Watcher.Graph())
}

// GET /api/events — SSE stream; sends a full graph update on every Flux change.
func (h *Handler) StreamEvents(c *gin.Context) {
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	ch := h.Watcher.Subscribe()
	defer h.Watcher.Unsubscribe(ch)

	sendGraph(c, h.Watcher.Graph())

	for {
		select {
		case graph, ok := <-ch:
			if !ok {
				return
			}
			sendGraph(c, graph)
		case <-c.Request.Context().Done():
			return
		}
	}
}

// GET /api/info — cluster metadata for the status ticker.
// All fields are discovered dynamically from the k8s API — nothing is hardcoded.
func (h *Handler) GetInfo(c *gin.Context) {
	ctx := c.Request.Context()
	info := models.ClusterInfo{
		ClusterName: clusterName(),
	}

	// Kubernetes server version.
	if sv, err := h.Discovery.ServerVersion(); err == nil {
		info.K8sVersion = sv.GitVersion
	}

	// OS image from the first ready node (works on any distro).
	var nodes corev1.NodeList
	if err := h.Client.List(ctx, &nodes); err == nil {
		for _, node := range nodes.Items {
			if img := node.Status.NodeInfo.OSImage; img != "" {
				info.OsImage = img
				break
			}
		}
	}

	// Flux version from source-controller deployment image tag.
	var dep appsv1.Deployment
	if err := h.Client.Get(ctx, types.NamespacedName{
		Name: "source-controller", Namespace: "flux-system",
	}, &dep); err == nil {
		for _, ctr := range dep.Spec.Template.Spec.Containers {
			if ctr.Name == "manager" {
				info.FluxVersion = imageTag(ctr.Image)
			}
		}
	}

	// CNI: scan all DaemonSets cluster-wide; match by image name.
	info.CniVersion = discoverCni(ctx, h.Client)

	// Ingress controller: scan Deployments + DaemonSets cluster-wide.
	info.IngressController = discoverIngress(ctx, h.Client)

	c.JSON(http.StatusOK, info)
}

// discoverCni scans all DaemonSets looking for a known CNI image name.
// Returns "name vX.Y.Z" or empty string.
func discoverCni(ctx context.Context, c client.Client) string {
	cniPatterns := []struct{ match, label string }{
		{"cilium-agent", "Cilium"},
		{"cilium", "Cilium"},
		{"calico-node", "Calico"},
		{"calico", "Calico"},
		{"flannel", "Flannel"},
		{"weave-npc", "Weave"},
		{"weave", "Weave"},
		{"canal", "Canal"},
		{"kube-router", "kube-router"},
	}
	var dsList appsv1.DaemonSetList
	if err := c.List(ctx, &dsList); err != nil {
		return ""
	}
	for _, ds := range dsList.Items {
		for _, ctr := range ds.Spec.Template.Spec.Containers {
			for _, p := range cniPatterns {
				if strings.Contains(ctr.Name, p.match) || strings.Contains(ctr.Image, p.match) {
					return p.label + " " + imageTag(ctr.Image)
				}
			}
		}
	}
	return ""
}

// discoverIngress scans Deployments and DaemonSets for a known ingress controller.
func discoverIngress(ctx context.Context, c client.Client) string {
	ingressPatterns := []struct{ match, label string }{
		{"cilium", "Cilium Gateway API"},
		{"ingress-nginx", "ingress-nginx"},
		{"nginx-ingress", "nginx-ingress"},
		{"traefik", "Traefik"},
		{"istio", "Istio"},
		{"contour", "Contour"},
		{"haproxy", "HAProxy Ingress"},
		{"kong", "Kong"},
		{"envoy", "Envoy Gateway"},
	}
	check := func(name, image string) string {
		for _, p := range ingressPatterns {
			if strings.Contains(name, p.match) || strings.Contains(image, p.match) {
				tag := imageTag(image)
				if tag != "unknown" && tag != "" {
					return p.label + " " + tag
				}
				return p.label
			}
		}
		return ""
	}

	var depList appsv1.DeploymentList
	if err := c.List(ctx, &depList); err == nil {
		for _, d := range depList.Items {
			for _, ctr := range d.Spec.Template.Spec.Containers {
				if v := check(d.Name, ctr.Image); v != "" {
					return v
				}
			}
		}
	}
	var dsList appsv1.DaemonSetList
	if err := c.List(ctx, &dsList); err == nil {
		for _, ds := range dsList.Items {
			for _, ctr := range ds.Spec.Template.Spec.Containers {
				if v := check(ds.Name, ctr.Image); v != "" {
					return v
				}
			}
		}
	}
	return ""
}

// clusterName returns the cluster name from env or a generic default.
func clusterName() string {
	if name := os.Getenv("CLUSTER_NAME"); name != "" {
		return name
	}
	return "kubernetes"
}

// imageTag extracts the tag portion from a container image reference.
func imageTag(image string) string {
	// Strip digest.
	if at := strings.Index(image, "@"); at > 0 {
		image = image[:at]
	}
	if colon := strings.LastIndex(image, ":"); colon > 0 {
		// Make sure this is a tag, not a port (no slash after colon).
		if !strings.Contains(image[colon:], "/") {
			return image[colon+1:]
		}
	}
	return "unknown"
}

func sendGraph(c *gin.Context, g interface{}) {
	data, err := json.Marshal(g)
	if err != nil {
		return
	}
	c.SSEvent("graph", string(data))
	c.Writer.Flush()
}

// GET /api/yaml/:kind/:namespace/:name — returns the live YAML of a k8s or Flux resource.
func (h *Handler) GetYAML(c *gin.Context) {
	ctx := c.Request.Context()
	kind := c.Param("kind")
	namespace := c.Param("namespace")
	name := c.Param("name")

	// Try typed Flux resource first.
	if obj, ok := kindToObject(kind); ok {
		if err := h.Client.Get(ctx, types.NamespacedName{Namespace: namespace, Name: name}, obj); err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		stripped := stripManagedFields(obj)
		yamlBytes, err := yaml.Marshal(stripped)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"yaml": string(yamlBytes)})
		return
	}

	// Fall back to unstructured for native k8s kinds.
	gvr, err := resolveGVR(h.Discovery, kind)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unknown kind: " + kind})
		return
	}

	var u unstructured.Unstructured
	u.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   gvr.Group,
		Version: gvr.Version,
		Kind:    strings.ToUpper(kind[:1]) + strings.ToLower(kind[1:]),
	})
	if err := h.Client.Get(ctx, types.NamespacedName{Namespace: namespace, Name: name}, &u); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// Strip managedFields from unstructured.
	m := u.Object
	delete(m["metadata"].(map[string]interface{}), "managedFields")
	yamlBytes, err := yaml.Marshal(m)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"yaml": string(yamlBytes)})
}

// GET /api/k8sevents/:kind/:namespace/:name — returns k8s events for a resource.
func (h *Handler) GetK8sEvents(c *gin.Context) {
	ctx := c.Request.Context()
	namespace := c.Param("namespace")
	name := c.Param("name")

	eventList, err := h.Clientset.CoreV1().Events(namespace).List(ctx, metav1.ListOptions{
		FieldSelector: "involvedObject.name=" + name,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	type eventItem struct {
		Type          string `json:"type"`
		Reason        string `json:"reason"`
		Message       string `json:"message"`
		Count         int32  `json:"count"`
		LastTimestamp string `json:"lastTimestamp"`
	}

	result := make([]eventItem, 0)
	for _, ev := range eventList.Items {
		ts := ""
		if !ev.LastTimestamp.IsZero() {
			ts = ev.LastTimestamp.UTC().Format(metav1.RFC3339Micro)
		}
		result = append(result, eventItem{
			Type:          ev.Type,
			Reason:        ev.Reason,
			Message:       ev.Message,
			Count:         ev.Count,
			LastTimestamp: ts,
		})
	}

	c.JSON(http.StatusOK, result)
}

// GET /api/logs/:namespace/:name — SSE stream for pod logs.
func (h *Handler) StreamLogs(c *gin.Context) {
	ctx := c.Request.Context()
	namespace := c.Param("namespace")
	name := c.Param("name")

	// Verify it's a pod.
	var pod corev1.Pod
	if err := h.Client.Get(ctx, types.NamespacedName{Namespace: namespace, Name: name}, &pod); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "pod not found"})
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	// Get pod log stream.
	req := h.Clientset.CoreV1().Pods(namespace).GetLogs(name, &corev1.PodLogOptions{
		Follow:    true,
		TailLines: int64Ptr(100),
	})
	stream, err := req.Stream(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer stream.Close()

	// Read stream and send as SSE.
	go func() {
		buf := make([]byte, 2048)
		for {
			n, err := stream.Read(buf)
			if n > 0 {
				c.SSEvent("log", string(buf[:n]))
				c.Writer.Flush()
			}
			if err != nil {
				return
			}
		}
	}()

	<-ctx.Done()
}

func int64Ptr(i int64) *int64 { return &i }

// resolveGVR finds the GroupVersionResource for a given kind name using discovery.
func resolveGVR(dc discovery.DiscoveryInterface, kind string) (schema.GroupVersionResource, error) {
	lists, err := dc.ServerPreferredResources()
	if err != nil && lists == nil {
		return schema.GroupVersionResource{}, err
	}
	kindLower := strings.ToLower(kind)
	for _, list := range lists {
		gv, err := schema.ParseGroupVersion(list.GroupVersion)
		if err != nil {
			continue
		}
		for _, r := range list.APIResources {
			if strings.ToLower(r.Kind) == kindLower {
				return schema.GroupVersionResource{
					Group:    gv.Group,
					Version:  gv.Version,
					Resource: r.Name,
				}, nil
			}
		}
	}
	return schema.GroupVersionResource{}, fmt.Errorf("kind %q not found", kind)
}

// stripManagedFields removes the managedFields from a typed object by marshalling
// to a map and deleting the key.
func stripManagedFields(obj interface{}) interface{} {
	data, err := json.Marshal(obj)
	if err != nil {
		return obj
	}
	var m map[string]interface{}
	if err := json.Unmarshal(data, &m); err != nil {
		return obj
	}
	if meta, ok := m["metadata"].(map[string]interface{}); ok {
		delete(meta, "managedFields")
	}
	return m
}

