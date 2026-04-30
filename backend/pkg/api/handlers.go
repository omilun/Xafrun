package api

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/omilun/fluxbaan/pkg/watcher"
)

type Handler struct {
	Watcher *watcher.Watcher
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
	c.Header("X-Accel-Buffering", "no") // disable nginx buffering if present

	ch := h.Watcher.Subscribe()
	defer h.Watcher.Unsubscribe(ch)

	// Send current state immediately so the client doesn't wait for a change.
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

func sendGraph(c *gin.Context, g interface{}) {
	data, err := json.Marshal(g)
	if err != nil {
		return
	}
	c.SSEvent("graph", string(data))
	c.Writer.Flush()
}
