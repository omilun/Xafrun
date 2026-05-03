# Status Ticker

The status ticker is a **compact scrolling chip** embedded in the right side of the filter toolbar bar. It gives a continuous at-a-glance summary of overall cluster health without taking up extra screen space.

## Location

The ticker sits at the far right of the filter/search toolbar bar (the bar below the main header that contains the search box and health filter chips). It is always visible when the App List is showing.

## Behaviour

| State | Appearance | Scrolling text |
|-------|-----------|----------------|
| **All healthy** | Green border chip with green tower icon | Cluster name, Flux version, K8s version, OS, CNI, ingress controller |
| **Unhealthy / Progressing** | Red border chip with red tower icon | Names and error messages of unhealthy resources |

The text scrolls automatically (marquee animation) when it is too wide to display in full. The scroll speed scales with text length.

## Data source

- **Health state** — derived from the live graph pushed by `GET /api/events` (SSE). Updates in real time without page reload.
- **Cluster metadata** — fetched once from `GET /api/info` on page load. Shows: cluster name, Flux version, Kubernetes version, OS image, CNI version, ingress controller.

!!! tip
    Even when the App List is filtered or searched, the ticker reflects the health of **all** resources in the cluster — not just the visible cards.
