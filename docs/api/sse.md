# Server-Sent Events

`GET /api/events` is a persistent **Server-Sent Events** (SSE) stream. The server pushes a full graph snapshot to every connected client whenever any Flux resource changes.

## Connecting

```javascript
const source = new EventSource('/api/events')

source.addEventListener('graph', (event) => {
  const graph = JSON.parse(event.data)
  // graph has the same shape as GET /api/tree
  console.log(graph.nodes, graph.edges)
})

source.addEventListener('error', (event) => {
  console.warn('SSE connection error, browser will retry', event)
})
```

The browser `EventSource` API reconnects automatically after a disconnect. No manual retry logic is needed.

## Wire format

Each update is a standard SSE frame:

```
event: graph
data: {"nodes":[...],"edges":[...]}

```

- The `event` field is always `graph`.
- The `data` field is a single-line JSON string with the same schema as [`GET /api/tree`](rest.md).
- Each frame is terminated by a blank line.

### Initial event

Immediately after the client connects, the server sends one `graph` event with the current snapshot. This ensures the client always sees the current state without waiting for the next Kubernetes watch event.

## Response headers

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

`X-Accel-Buffering: no` disables nginx/Envoy response buffering, which would otherwise delay event delivery.

## Reconnection semantics

`EventSource` uses the browser's built-in reconnect. The server does not send `id:` or `retry:` fields — each reconnect replays the current snapshot via the initial event, so clients always converge to the correct state.

## Slow consumer behaviour

If a client is too slow to consume events (e.g., a stalled TCP connection), the backend drops the pending graph update and replaces it with the newest one. This means:

- **No memory build-up** — the subscriber channel is bounded to size 1.
- **No blocking** — a slow client never delays other clients.
- **At-most-one-pending** — a fast-changing cluster may cause intermediate states to be skipped, but the client always receives the latest snapshot.

!!! tip "curl for debugging"
    You can observe the raw SSE stream with:
    ```bash
    curl -N http://localhost:8080/api/events
    ```
