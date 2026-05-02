# Xafrun: Design & Implementation Plan 🗺️

## 1. The Problem Statement
**"The Flux UI Paradox"**
Flux CD is a world-class GitOps engine, but its visibility is fragmented. Unlike Argo CD, which provides a cohesive visual "Resource Tree," Flux users are forced to choose between:
- **CLI-only visibility:** Great for power users, but hard for "at-a-glance" auditing.
- **General Dashboards (Headlamp/Lens):** Overloaded with non-GitOps cluster noise.
- **Fragmented UIs:** Existing tools often focus on lists rather than the **logical-to-physical mapping** (Source -> Kustomization -> Pods).

## 2. The Vision
**Xafrun** (Flux + Kanban/Workflow) aims to be the missing "visual bridge" for Flux CD. It visualizes the entire GitOps lifecycle in an interactive graph, showing not just *if* something is synced, but *what* physical resources were created as a result.

## 3. Technical Architecture

### Frontend: Next.js + React Flow
- **Framework:** Next.js 16 (App Router) on React 19.
- **Visualization:** **React Flow** for the interactive node graph.
- **Layout:** **dagre** computes a top-down (TB) layered layout; the view is
  re-fit on every graph change.
- **Real-time updates:** the page subscribes to `/api/events` via the browser
  `EventSource` API and replaces its graph state on every frame. *(No polling,
  no TanStack Query — that was the original design but proved unnecessary once
  SSE was in place.)*
- **Styling:** Tailwind CSS, "Argo-inspired" but lighter.
- **Sidebar:** Per-namespace tabs with health dot + count badge. Selecting a
  namespace runs `filterGraph()`, which keeps ancestors visible so Source →
  Kustomization → HelmRelease chains stay intact.

### Backend: Golang
- **Engine:** Go 1.26 service using `client-go` + `controller-runtime`
  informers. Caches are driven by a single `cache.Cache` shared across
  resource types.
- **Watcher Logic:** Subscribes informer event handlers for `GitRepository`,
  `Kustomization`, and `HelmRelease`. On any add/update/delete it performs a
  full graph rebuild (the graph is small; this trades a little CPU for a much
  simpler programming model).
- **Push pipeline:** Each rebuild broadcasts the new graph snapshot to all
  subscribers via a buffered `chan models.Graph`. Slow consumers have their
  oldest pending value dropped instead of blocking the producer.
- **API (Gin):**
  - `GET /api/tree` — current snapshot.
  - `GET /api/events` — SSE stream of `event: graph` frames.
  - `GET /api/info` — cluster metadata (K8s, Flux, Talos, Cilium versions)
    used by the bottom status ticker.

### Database: CloudNativePG (CNPG)
- **Choice:** **PostgreSQL** via the **CloudNativePG** operator (already present in the Talos-on-macos cluster).
- **Purpose:** 
    - **History Tracking:** Move beyond "current state." Store a historical record of every reconciliation event.
    - **Auditing:** See exactly when a `Kustomization` changed from `Ready` to `Failed` and what the error message was at that time.
    - **Performance:** Cache complex graph relationships to reduce API load on the cluster for historical views.

## 4. Implementation Roadmap

### Phase 1: Real-time Visualizer + ArgoCD-style UX (Completed ✅)
- [x] Scaffold Go Backend with Flux API support.
- [x] Scaffold Next.js Frontend with React Flow.
- [x] Implement "Tree Logic" (Source → Kustomization / HelmRelease mapping).
- [x] Initial Dockerization (in-cluster BuildKit + Argo Workflows).
- [x] Switch to **SSE + Informers** (replaces the original TanStack polling).
- [x] Status ticker (collapsible bottom bar with cluster metadata).
- [x] Helm chart, in-cluster CI/release, signed images, MkDocs site.
- [x] **ArgoCD-style redesign** — two-screen UX: App List card grid → App Detail graph.
- [x] **Inventory parsing** — Kustomization `node.inventory[]` entries rendered as child nodes.
- [x] **ResourceDrawer** — tabbed panel (Overview / YAML / Events / Logs) on node click.
- [x] **Reconcile / Suspend / Resume** — action buttons wired to backend PATCH endpoints.
- [x] **Pod log streaming** — SSE-based log viewer for inventory Pod resources.

### Phase 2: Persistence & History (Next 🛠️)
- [ ] **Database Schema:** Define tables for `reconciliation_history`, `resource_snapshots`, and `events`.
- [ ] **CNPG Integration:** Add a PostgreSQL `Cluster` manifest to the GitOps repo.
- [ ] **GORM Integration:** Update the Go backend to persist every Flux status change to the DB.
- [ ] **Frontend Timeline:** Add a "History" sidebar to the UI to browse past reconciliations.

### Phase 3: Advanced Features
- [ ] **YAML edit + apply** — write YAML changes back to the cluster (currently read-only).
- [ ] **Diff View:** Show the YAML diff between what's in Git and what's in the Cluster.
- [ ] **Multi-cluster:** Support for aggregating Flux state from multiple remote clusters.

---
**Created by:** Omilun
**Date:** May 2026
