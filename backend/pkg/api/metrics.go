package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	graphNodesTotal = prometheus.NewGaugeVec(prometheus.GaugeOpts{
		Name: "xafrun_graph_nodes_total",
		Help: "Total number of graph nodes by kind.",
	}, []string{"kind"})

	graphUnhealthyTotal = prometheus.NewGaugeVec(prometheus.GaugeOpts{
		Name: "xafrun_graph_unhealthy_total",
		Help: "Number of unhealthy graph nodes by kind.",
	}, []string{"kind"})

	sseSubscribers = prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "xafrun_sse_subscribers",
		Help: "Current number of SSE subscribers.",
	})

	graphRebuildDuration = prometheus.NewHistogram(prometheus.HistogramOpts{
		Name:    "xafrun_graph_rebuild_duration_seconds",
		Help:    "Duration of graph rebuild operations.",
		Buckets: prometheus.DefBuckets,
	})

	graphRebuildsTotal = prometheus.NewCounter(prometheus.CounterOpts{
		Name: "xafrun_graph_rebuilds_total",
		Help: "Total number of graph rebuilds.",
	})

	httpRequestsTotal = prometheus.NewCounterVec(prometheus.CounterOpts{
		Name: "xafrun_http_requests_total",
		Help: "Total HTTP requests by method, path, and status code.",
	}, []string{"method", "path", "code"})
)

func init() {
	for _, c := range []prometheus.Collector{
		graphNodesTotal,
		graphUnhealthyTotal,
		sseSubscribers,
		graphRebuildDuration,
		graphRebuildsTotal,
		httpRequestsTotal,
		collectors.NewGoCollector(),
		collectors.NewBuildInfoCollector(),
	} {
		_ = prometheus.Register(c)
	}
}

// PrometheusRecorder implements watcher.MetricsRecorder using the default
// Prometheus registry.
type PrometheusRecorder struct{}

func (PrometheusRecorder) RecordRebuild(nodes map[string]int, unhealthy map[string]int, durationSeconds float64) {
	graphRebuildDuration.Observe(durationSeconds)
	for kind, count := range nodes {
		graphNodesTotal.WithLabelValues(kind).Set(float64(count))
	}
	for kind, count := range unhealthy {
		graphUnhealthyTotal.WithLabelValues(kind).Set(float64(count))
	}
}

func (PrometheusRecorder) IncRebuildsTotal()   { graphRebuildsTotal.Inc() }
func (PrometheusRecorder) IncSSESubscribers()  { sseSubscribers.Inc() }
func (PrometheusRecorder) DecSSESubscribers()  { sseSubscribers.Dec() }

// MetricsHandler returns the Prometheus HTTP handler for /metrics.
func MetricsHandler() gin.HandlerFunc {
	h := promhttp.Handler()
	return func(c *gin.Context) {
		h.ServeHTTP(c.Writer, c.Request)
	}
}

// HTTPMetricsMiddleware records HTTP request metrics.
func HTTPMetricsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
		httpRequestsTotal.WithLabelValues(
			c.Request.Method,
			c.FullPath(),
			http.StatusText(c.Writer.Status()),
		).Inc()
	}
}
