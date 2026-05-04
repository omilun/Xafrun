# Frontend Architecture

The Xafrun frontend is a **Next.js 15 (App Router)** application written in TypeScript.
It renders an interactive dependency graph using **React Flow** with a **Dagre** layout engine.

---

## Two-screen UX

### Screen 1 — App List (default)

The landing page shows a card grid of every `Kustomization` and `HelmRelease` in the cluster.
Orchestrator Kustomizations (those whose inventory includes other Flux sources) are hidden;
only leaf "deployable" apps appear.

| Component | Role |
|-----------|------|
| `AppList.tsx` | Responsive card grid + filter toolbar |
| `AppCard.tsx` | Single card: kind badge, name, namespace, health border colour, sync status |
| `page.tsx` | Layout glue: holds `screen` state (`list` \| `detail`), passes `selectedApp` down |

**Filter toolbar** (within `page.tsx`):
- Search input (filters by app name)
- Health filter chips — **All / Healthy / Unhealthy / Progressing** with live counts shown as `StatPill` badges
- Logo + "Xafrun" header with "GitOps Visualization" subtitle
- `ThemeToggle` (dark / light)
- `CommandPalette` trigger (Cmd+K / Ctrl+K)
- **Status ticker inline** — scrolls through active Flux resource statuses; turns red on errors

### Screen 2 — App Detail

Clicking an app opens the full-screen dependency graph for that single app.

```
Source  ──►  App  ──►  K8s resource  (Deployment)
                  ──►  K8s resource  (Service)
                  ──►  K8s resource  (ConfigMap)
                  ...
```

Layout direction: **TB (top-down)**. Edges: `smoothstep`. The TB layout uses Top/Bottom
handles; the overview graph (all apps) uses LR layout with Left/Right handles.

| Component | Role |
|-----------|------|
| `AppDetail.tsx` | Header with back button + breadcrumb; renders `FluxTree` for the single app |
| `FluxTree.tsx` | React Flow canvas; builds Dagre graph from node list; renders `ResourceNode` |
| `ResourceNode.tsx` | Node card with colour-coded left stripe by resource category and health |

---

## ResourceDrawer

Clicking any node (Flux or K8s resource) opens a tabbed side-panel anchored to the right edge.

| Tab | API call | Notes |
|-----|----------|-------|
| Overview | — | Status badge, health message, Reconcile/Suspend/Resume buttons, metadata |
| YAML | `GET /api/yaml/:kind/:namespace/:name` | Syntax-highlighted read-only code block, managed-fields stripped |
| Events | `GET /api/k8sevents/:kind/:namespace/:name` | Kubernetes event list: type / reason / message / age |
| Logs | `GET /api/logs/:namespace/:name` (SSE) | Live pod log stream; only shown for Pod/Deployment nodes |

---

## Resource category colours

K8s inventory nodes have a left accent stripe coloured by category:

| Colour | Category | Kinds |
|--------|----------|-------|
| Blue | Workloads | Deployment, StatefulSet, DaemonSet, Job, CronJob, Pod |
| Cyan | Services | Service, Endpoints |
| Green | Networking | Ingress, IngressRoute, HTTPRoute, Gateway |
| Yellow | Config | ConfigMap, Secret, PersistentVolumeClaim |
| Pink | RBAC | ClusterRole, ClusterRoleBinding, Role, RoleBinding, ServiceAccount |
| Teal | Cert-manager | Certificate, Issuer, ClusterIssuer |

---

## API proxy

The Next.js frontend proxies all `/api/*` requests to the backend via a catch-all route
(`src/app/api/[...path]/route.ts`). This avoids CORS issues and allows the frontend container
to be deployed with only one exposed service.

Backend URL resolution order:
1. `BACKEND_URL` environment variable
2. `http://xafrun-backend:8080` (in-cluster service name)
3. `http://localhost:8080` (local dev fallback)

---

## State management

Xafrun uses **React `useState`** only — no Redux, no Zustand, no Context for app state.
All data is fetched by the backend SSE stream (`/api/events`) and stored in the top-level
`page.tsx` component, then passed down as props. This keeps the dependency tree minimal and
the codebase easy to follow.

---

## Key dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react-flow` | 12.x | Graph canvas, pan/zoom, custom nodes |
| `dagre` | 0.8.x | Automatic graph layout (TB and LR) |
| `next` | 15.x | App Router, server components, API routes |
| `tailwindcss` | 4.x | Utility-first styling |
| `lucide-react` | latest | Icon set |
| `eventsource` | — | SSE subscription to `/api/events` |
