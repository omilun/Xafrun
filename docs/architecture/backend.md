# Backend: Informers + SSE

The backend is a single Go binary that bridges the Kubernetes API to browser clients via HTTP.

## controller-runtime cache

`main.go` creates a `cache.Cache` backed by controller-runtime. The cache registers **informers** for three resource types:

- `sourcev1.GitRepository`
- `kustomizev1.Kustomization`
- `helmv2.HelmRelease`

Each informer opens a long-running **watch** against the Kubernetes API server. When Kubernetes emits an `ADDED`, `MODIFIED`, or `DELETED` event for any of these types, the cache is updated and the registered event handler is called.

## Watcher (`pkg/watcher`)

The `Watcher` struct owns the in-memory graph and the subscriber set.

```go
type Watcher struct {
    ctrlClient  client.Client
    ctrlCache   cache.Cache
    mu          sync.RWMutex
    graph       models.Graph
    subscribers map[chan models.Graph]struct{}
}
```

### On-change rebuild strategy

Every Add/Update/Delete event triggers a **full graph rebuild** (`w.rebuild(ctx)`):

1. List all `GitRepository`, `Kustomization`, and `HelmRelease` objects from the cache (reads are local, not a round-trip to the API server).
2. Build a fresh `models.Graph` with nodes and edges.
3. Acquire the write lock and atomically replace `w.graph`.
4. Broadcast the new graph to all subscribers.

**Why full rebuild instead of incremental diff?**

- The graph is small (tens to low hundreds of nodes).
- Incremental diffing adds significant complexity and is a common source of bugs (e.g., missed edge deletions when a source is renamed).
- Clients receive a clean, self-consistent snapshot every time.

### Slow-consumer drop semantics

Each subscriber gets a **buffered channel of size 1**. If a subscriber is slow to consume (e.g., a stalled HTTP write), the broadcaster drops the pending value and replaces it with the newest graph:

```go
select {
case ch <- g:
default:
    // drain stale value
    select { case <-ch: default: }
    ch <- g
}
```

This prevents a slow browser client from blocking the broadcaster or building up an unbounded queue.

## SSE handler (`GET /api/events`)

When a client connects:

1. Sets `Content-Type: text/event-stream` and disables buffering (`X-Accel-Buffering: no`).
2. Calls `watcher.Subscribe()` to get a dedicated channel.
3. Immediately sends the current graph as the first event (so the client gets a snapshot without waiting for the next change).
4. Loops on the channel, serialising each graph to JSON and writing `event: graph\ndata: <json>\n\n`.
5. On client disconnect (`c.Request.Context().Done()`), calls `watcher.Unsubscribe()`.

## Gin + CORS

The HTTP server uses [Gin](https://gin-gonic.com/) with `cors.Default()`, which allows all origins. In production, configure `cors.New` with an explicit `AllowOrigins` list.
