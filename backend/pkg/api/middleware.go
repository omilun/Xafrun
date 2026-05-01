package api

import (
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// RequestLogger returns a gin middleware that logs each request via slog
// (skipping health/metrics paths) and adds an X-Request-ID header.
func RequestLogger() gin.HandlerFunc {
	skip := map[string]bool{
		"/healthz": true,
		"/readyz":  true,
		"/metrics": true,
	}
	return func(c *gin.Context) {
		if skip[c.Request.URL.Path] {
			c.Next()
			return
		}

		start := time.Now()
		reqID := uuid.New().String()
		c.Header("X-Request-ID", reqID)

		c.Next()

		slog.Info("http request",
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"status", c.Writer.Status(),
			"duration_ms", time.Since(start).Milliseconds(),
			"request_id", reqID,
			"remote_addr", c.ClientIP(),
		)
	}
}
