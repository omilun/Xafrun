// Package api provides the HTTP handlers for the Xafrun backend.
package api

import (
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
func (h *Handler) GetInfo(c *gin.Context) {
	ctx := c.Request.Context()
	info := models.ClusterInfo{
		ClusterName:       clusterName(),
		IngressController: "Cilium Gateway API",
	}

	// Kubernetes server version.
	if sv, err := h.Discovery.ServerVersion(); err == nil {
		info.K8sVersion = sv.GitVersion
	}

	// Talos version from the first node's OS image label.
	var nodes corev1.NodeList
	if err := h.Client.List(ctx, &nodes); err == nil && len(nodes.Items) > 0 {
		info.TalosVersion = nodes.Items[0].Status.NodeInfo.OSImage
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

	// Cilium version from cilium DaemonSet image tag.
	var ds appsv1.DaemonSet
	if err := h.Client.Get(ctx, types.NamespacedName{
		Name: "cilium", Namespace: "kube-system",
	}, &ds); err == nil {
		for _, ctr := range ds.Spec.Template.Spec.Containers {
			if ctr.Name == "cilium-agent" {
				info.CiliumVersion = imageTag(ctr.Image)
			}
		}
	}

	c.JSON(http.StatusOK, info)
}

// clusterName returns the cluster name from env or a sensible default.
func clusterName() string {
	if name := os.Getenv("CLUSTER_NAME"); name != "" {
		return name
	}
	return "talos-tart-ha"
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

