# Frontend: Two-screen UX + React Flow

The frontend is a **Next.js App Router** application with two primary screens (state-based, no URL routing for MVP).

## Screen 1 — App List

The default view renders a responsive card grid of all Flux apps (`Kustomization` + `HelmRelease`). Top-level orchestrator resources are filtered out so only deployable units appear.

**Key components:**

| Component | File | Role |
|-----------|------|------|
| `AppList` | `src/components/AppList.tsx` | Card grid, search/filter bar |
| `AppCard` | `src/components/AppCard.tsx` | Single app card with status, kind badge, actions |

Data flows in via the SSE `EventSource` on `GET /api/events`. On every graph event, the app list re-renders from the updated node set.

## Screen 2 — App Detail

Clicking a card switches state to the App Detail view for that specific app. This renders a full-screen React Flow graph with three node tiers: Source → App → inventory K8s resources.

**Key components:**

| Component | File | Role |
|-----------|------|------|
| `AppDetail` | `src/components/AppDetail.tsx` | Header (back/breadcrumb) + React Flow canvas |
| `ResourceNode` | `src/components/ResourceNode.tsx` | Custom node component (Flux or k8s variant) |

### Inventory parsing

Kustomization inventory entries follow the format `{namespace}_{name}_{group}_{kind}`. The frontend parses these into structured objects and renders them as child nodes:

```typescript
function parseInventoryId(id: string): { namespace: string; name: string; group: string; kind: string }
```

### React Flow + dagre layout

- Nodes are custom React components styled by their `status` field (Healthy/Progressing/Unhealthy/Unknown → green/yellow/red/grey border).
- The layout is computed with **[dagre](https://github.com/dagrejs/dagre)** in `TB` (top-to-bottom) direction.
- After each layout pass, `fitView()` is called to fit all nodes into the viewport.
- Controls (zoom, minimap) are enabled via standard React Flow `<Controls>` and `<MiniMap>` components.

## ResourceDrawer

Clicking any node opens the `ResourceDrawer` — a tabbed side-panel docked to the right.

| Tab | Data source | Notes |
|-----|-------------|-------|
| Overview | Node data from the graph | Status, message, Reconcile / Suspend / Resume buttons |
| YAML | `GET /api/yaml/:kind/:namespace/:name` | Read-only; `managedFields` stripped |
| Events | `GET /api/k8sevents/:kind/:namespace/:name` | k8s event list |
| Logs | `GET /api/logs/:namespace/:name` (SSE) | Pod logs only |

## SSE connection (EventSource)

The frontend opens a native browser `EventSource` to `GET /api/events`:

```typescript
const source = new EventSource('/api/events')
source.addEventListener('graph', (e) => {
  const graph = JSON.parse(e.data)
  // update app list + current detail view
})
```

`EventSource` reconnects automatically on disconnect. No manual retry logic is needed.

## Next.js proxy routes

All `/api/*` requests from the browser are handled by Next.js Route Handlers in `src/app/api/`. Each route proxies to the Go backend at `http://localhost:8080` (local dev) or `http://xafrun-backend:8080` (in-cluster).

```
src/app/api/
  events/route.ts                          → GET /api/events (SSE passthrough)
  tree/route.ts                            → GET /api/tree
  info/route.ts                            → GET /api/info
  yaml/[kind]/[namespace]/[name]/route.ts  → GET /api/yaml/:kind/:namespace/:name
  k8sevents/[kind]/[namespace]/[name]/route.ts → GET /api/k8sevents/:kind/:namespace/:name
  logs/[namespace]/[name]/route.ts         → GET /api/logs/:namespace/:name (SSE passthrough)
  reconcile/[kind]/[namespace]/[name]/route.ts → POST /api/reconcile
  suspend/[kind]/[namespace]/[name]/route.ts   → POST /api/suspend
  resume/[kind]/[namespace]/[name]/route.ts    → POST /api/resume
```

All write routes handle `204 No Content` explicitly — they do not attempt to parse an empty body.

## Status ticker

The `NewsTicker` component is docked to the bottom of the screen. It:

- Fetches cluster metadata once from `/api/info` on mount.
- Checks the graph for any `Unhealthy` or `Progressing` nodes to set the bar colour.
- Starts **closed by default** and auto-opens when any resource is unhealthy.
- Scrolls a list of cluster info items (K8s version, Flux version, CNI, ingress, OS image) when healthy.

## CommandPalette

`Ctrl+K` / `Cmd+K` opens the command palette, which allows quick navigation to any app by name.
