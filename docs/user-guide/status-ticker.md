# Status Ticker

The status ticker is a collapsible bar fixed to the bottom of the screen. It summarises the overall cluster state at a glance.

## Collapsed state

In its default collapsed state, the ticker appears as a **thin coloured line**:

| Colour | Meaning |
|--------|---------|
| 🟢 Green | All visible resources are healthy |
| 🟡 Yellow | One or more resources are progressing |
| 🔴 Red | One or more resources are unhealthy |

Click anywhere on the bar to expand it.

## Expanded state

### When healthy

The expanded ticker shows cluster metadata fetched from [`GET /api/info`](../api/rest.md#get-apiinfo):

```
cluster: talos-tart-ha  |  k8s: v1.30.2  |  flux: v2.3.0  |  talos: Talos (v1.7.4)  |  cilium: v1.15.6
```

This information scrolls as a marquee if it's wider than the bar.

### When unhealthy

Instead of the metadata marquee, the ticker lists the **names and error messages** of every unhealthy resource, scrolling continuously. This lets you spot failing resources without opening the graph.

Example:

```
⚠ apps/podinfo-release: Helm upgrade failed: … | ✗ flux-system/infrastructure: kustomize build failed …
```

## Data source

Cluster metadata comes from `GET /api/info`, which is polled on page load and whenever the SSE connection reconnects. The health colour is derived from the live graph state pushed by `GET /api/events`.

!!! tip
    The ticker is especially useful when the graph is zoomed in and individual nodes are off-screen — the red bar immediately signals that something elsewhere in the cluster needs attention.
