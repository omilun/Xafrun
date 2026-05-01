# Frontend: React Flow + dagre

The frontend is a **Next.js App Router** application that renders the live graph in the browser.

## Next.js proxy routes

All `/api/*` requests from the browser are proxied to the Go backend at `localhost:8080`. This is configured in `next.config.ts` using Next.js `rewrites`:

```typescript
async rewrites() {
  return [
    { source: '/api/:path*', destination: 'http://localhost:8080/api/:path*' }
  ]
}
```

In a deployed pod, the frontend and backend share the same hostname, so no proxy configuration is needed in production.

## React Flow graph

The graph component uses [React Flow](https://reactflow.dev/) for interactive node-edge rendering:

- Nodes are custom React components styled by their `status` field (Healthy/Progressing/Unhealthy/Unknown → green/yellow/red/grey border).
- Edges are straight arrows connecting parent to child.
- The layout is computed with **[dagre](https://github.com/dagrejs/dagre)** in `TB` (top-to-bottom) direction, so sources always appear above consumers.
- After each layout pass, `fitView()` is called to ensure all nodes are visible.

## SSE connection (EventSource)

The frontend opens a native browser `EventSource` to `GET /api/events`:

```typescript
const source = new EventSource('/api/events')
source.addEventListener('graph', (e) => {
  const graph = JSON.parse(e.data)
  setNodes(toReactFlowNodes(graph.nodes))
  setEdges(toReactFlowEdges(graph.edges))
})
```

`EventSource` reconnects automatically on disconnect (using exponential back-off built into the browser). No manual retry logic is needed.

## Namespace filter — `filterGraph` ancestor walk

The `filterGraph` function takes the full graph and a set of selected namespaces and returns a filtered graph:

1. Keep all nodes whose `namespace` is in the selected set.
2. For each kept node, walk up the edge list to find ancestors; keep those too.
3. Keep only edges where both source and target are in the kept node set.

This ensures that selecting `apps` also surfaces `flux-system` sources that feed it, preserving the visual dependency chain.

## Status ticker

The ticker component subscribes to the same React state as the graph. It checks whether any node has `status === "Unhealthy"` or `status === "Progressing"` to determine the bar colour. Cluster metadata is fetched once from `/api/info` on mount.
