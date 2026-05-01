// Package api provides the HTTP handlers for the Xafrun backend.
package api

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/discovery"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/omilun/xafrun/pkg/models"
	"github.com/omilun/xafrun/pkg/watcher"
)

type Handler struct {
	Watcher   *watcher.Watcher
	Client    client.Client
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

