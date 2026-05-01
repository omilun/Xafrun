// Package api provides the HTTP handlers for the Fluxbaan backend.
package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetHealthz is the liveness probe — always returns 200.
func (h *Handler) GetHealthz(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// GetReadyz is the readiness probe — returns 503 until the informer cache has synced.
func (h *Handler) GetReadyz(c *gin.Context) {
	if h.Watcher.Ready() {
		c.JSON(http.StatusOK, gin.H{"status": "ready"})
		return
	}
	c.JSON(http.StatusServiceUnavailable, gin.H{
		"status": "not_ready",
		"reason": "informers syncing",
	})
}
