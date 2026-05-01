# Filtering by Namespace

The left sidebar lists every namespace that contains at least one Flux resource. Clicking a namespace toggles it in the active filter.

## How filtering works

When one or more namespaces are selected:

1. Only nodes whose `namespace` field matches a selected namespace are shown directly.
2. **Ancestor walk** — for each visible node, Xafrun walks *up* the dependency edges and keeps all ancestor nodes visible too, even if they live in a different namespace.

## Example

Suppose you have:

```
flux-system/main-repo  (GitRepository)
       │
       ▼
flux-system/infrastructure  (Kustomization)
       │
       ▼
apps/podinfo  (Kustomization)
       │
       ▼
apps/podinfo-release  (HelmRelease)
```

If you select only the **`apps`** namespace, Xafrun shows:

- `apps/podinfo` ✅ (directly selected)
- `apps/podinfo-release` ✅ (directly selected)
- `flux-system/infrastructure` ✅ (ancestor of `apps/podinfo`)
- `flux-system/main-repo` ✅ (ancestor of `flux-system/infrastructure`)

This means you always see the **full path from source to leaf**, making it easy to trace why a resource in `apps` is unhealthy — the problem might be a GitRepository in `flux-system`.

## Selecting all namespaces

When no namespace is selected (the default), all resources across all namespaces are shown. This gives you the complete cluster-wide picture.

!!! note
    The namespace list refreshes automatically via the same SSE stream that drives the graph. Adding a new namespace to the cluster will appear in the sidebar without a page reload.
