# App List (main view)

When you open Xafrun, the default view is the **App List** — a card grid showing every Flux-managed application deployed in your cluster.

## What is shown

Each card represents one `Kustomization` or `HelmRelease` that an operator deployed via Flux. Top-level orchestrator resources (e.g. `flux-system/apps`, `flux-system/infrastructure`) are hidden — only deployable units appear.

```
┌───────────────────────────────┐  ┌───────────────────────────────┐
│ HelmRelease                   │  │ Kustomization                  │
│ cert-manager       flux-system│  │ podinfo              apps     │
│ ● Healthy          Synced     │  │ ● Healthy            Synced   │
│ Source: GitRepository/main    │  │ Source: GitRepository/main    │
│ Last sync: 2m ago             │  │ Last sync: 5s ago             │
└───────────────────────────────┘  └───────────────────────────────┘
```

### Card fields

| Field | Description |
|-------|-------------|
| **Kind badge** | `HelmRelease` or `Kustomization` |
| **Name** | Resource name (bold) |
| **Namespace** | Resource namespace (top-right) |
| **Border colour** | Health status: green = Healthy, yellow = Progressing, red = Unhealthy, grey = Unknown |
| **Sync status** | `Synced`, `OutOfSync`, `Suspended`, etc. |
| **Source ref** | The GitRepository or HelmRepository this app reads from |
| **Last sync time** | Human-readable relative time of the last successful reconciliation |

### Filter bar

The toolbar below the header contains:

- **Search** — filter cards by name or namespace in real time.
- **Health filter chips** — clickable pills showing `All`, `Healthy`, `Unhealthy`, and `Progressing`, each with a **live count badge**. Click to filter; click again to clear. A **Clear** button appears when a filter is active.
- **N / Total counter** — shows `filtered / total` count when a filter or search is active.
- **Status ticker** — far right of the toolbar; a compact scrolling chip showing cluster health. Green when all resources are healthy; red when one or more are unhealthy.

## App Detail (second screen)

Clicking any card opens the **App Detail** view — a full-screen React Flow graph for that single application.

```
[ GitRepository: flux-system/main-repo ]
              │
              ▼
  [ Kustomization: cert-manager ]
       │          │          │
       ▼          ▼          ▼
[Deployment] [Service] [Certificate]
cert-manager cert-manager root-ca
```

- **Source node** — the GitRepository or HelmRepository backing this app.
- **App node** — the Kustomization or HelmRelease itself (centre).
- **Inventory nodes** — Kubernetes resources created by the app, parsed from the Kustomization's `node.inventory[]` list. Resources are grouped by kind (Deployments, Services, Secrets, ConfigMaps…).

The graph uses **dagre** top-down layout with `fitView` on every render. You can also pan, zoom, and use the minimap.

!!! tip
    Use the **Back** button or breadcrumb (`Apps › cert-manager`) to return to the App List.

## ResourceDrawer

Clicking any node in the detail graph (or any card in the App List) opens the **ResourceDrawer** on the right side. It has four tabs:

### Overview tab

- Health status badge (Healthy / Progressing / Unhealthy / Unknown / Suspended).
- Last reconciliation message.
- **Actions:**
  - **Reconcile** — triggers an immediate Flux reconciliation.
  - **Suspend** — pauses reconciliation (`spec.suspend: true`).
  - **Resume** — re-enables reconciliation (`spec.suspend: false`).
- Resource metadata (namespace, kind, source ref, last applied revision).

### YAML tab

Read-only, syntax-highlighted YAML of the resource. `managedFields` is stripped for readability. Fetched from `GET /api/yaml/:kind/:namespace/:name`.

### Events tab

Kubernetes events for this resource — type, reason, message, count, and age. Fetched from `GET /api/k8sevents/:kind/:namespace/:name`. Empty state is shown when no events exist.

### Logs tab

Live Pod log stream via SSE (`GET /api/logs/:namespace/:name`). Only available when the selected node is a Pod. Log lines appear in real time; the view auto-scrolls to the bottom.
