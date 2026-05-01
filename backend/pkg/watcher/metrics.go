// Package watcher defines the MetricsRecorder interface used to decouple
// the watcher from any specific metrics implementation.
package watcher

// MetricsRecorder receives telemetry from the watcher after each graph rebuild.
type MetricsRecorder interface {
	// RecordRebuild records node counts and unhealthy counts by kind,
	// as well as the total rebuild duration in seconds.
	RecordRebuild(nodes map[string]int, unhealthy map[string]int, durationSeconds float64)
	// IncRebuildsTotal increments the rebuild counter.
	IncRebuildsTotal()
	// IncSSESubscribers increments the SSE subscriber gauge.
	IncSSESubscribers()
	// DecSSESubscribers decrements the SSE subscriber gauge.
	DecSSESubscribers()
}
