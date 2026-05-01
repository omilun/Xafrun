# The Dashboard

When you open Xafrun, the main area shows an interactive dependency graph of every Flux resource in your cluster (or the selected namespaces).

## Graph layout

The graph uses a **top-down dagre layout** (`TB` direction). Sources (GitRepositories) appear near the top; Kustomizations and HelmReleases flow downward from their respective sources.

```
  [ GitRepository: flux-system/main-repo ]
           │
           ▼
  [ Kustomization: flux-system/infrastructure ]
           │
           ▼
  [ HelmRelease: monitoring/kube-prometheus ]
```

## Nodes

Each rectangle represents one Flux resource. The border and background colour indicates health:

| Colour | Status |
|--------|--------|
| 🟢 Green | Healthy — `Ready: True` |
| 🟡 Yellow | Progressing — reconciling or being installed |
| 🔴 Red | Unhealthy — `Ready: False` with a non-progressing reason |
| ⚫ Grey | Unknown — no `Ready` condition yet |

Clicking a node opens a detail panel (coming soon) that will show the full status message, last-applied revision, and inventory.

## Edges

Directed edges (arrows) connect parent to child:

- **GitRepository → Kustomization** — drawn when a Kustomization's `spec.sourceRef` points to a GitRepository.
- **GitRepository → HelmRelease** — drawn when a HelmRelease's chart `sourceRef` points to a GitRepository.

## Fit view

The graph automatically fits all visible nodes into the viewport whenever the graph data changes. You can also drag, pan, and use the scroll wheel to zoom manually. The minimap in the bottom-right helps orient you in large graphs.

!!! tip
    Use the namespace sidebar to filter which resources appear. Parent nodes are always kept visible even if their namespace is not selected, so the dependency chain remains intact.
