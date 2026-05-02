# Architecture Overview

Xafrun is a lightweight two-tier application: a Go backend that watches the Kubernetes API and a Next.js frontend that renders the live dashboard.

## System diagram

```mermaid
graph TD
    K8S["Kubernetes API Server"]
    INF["controller-runtime\nInformers\n(one per resource type)"]
    W["Watcher\n(pkg/watcher)"]
    G["In-memory Graph\n(nodes + edges)"]
    SSE["SSE Broadcaster\n(GET /api/events)"]
    REST["REST Handler\n(GET /api/tree · /api/info\nGET /api/yaml · /api/k8sevents\nGET /api/logs [SSE]\nPOST /api/reconcile|suspend|resume)"]
    FE["Next.js Frontend\n(App List → App Detail\nReact Flow + dagre\nResourceDrawer)"]

    K8S -->|watch events| INF
    INF -->|Add/Update/Delete| W
    W -->|rebuild| G
    G -->|broadcast| SSE
    G -->|snapshot| REST
    SSE -->|event: graph| FE
    REST -->|JSON / SSE| FE
```

## Component summary

| Component | Role |
|-----------|------|
| **Kubernetes API Server** | Source of truth — emits watch events for Flux CRDs |
| **controller-runtime Informers** | Subscribe to watch events and maintain a local cache |
| **Watcher** | Registers informer handlers; rebuilds the graph on every event |
| **In-memory Graph** | Thread-safe snapshot of all nodes and edges |
| **SSE Broadcaster** | Pushes full graph snapshots to connected browser clients |
| **REST Handler** | Serves graph snapshots, cluster metadata, YAML, k8s events, logs, and write actions |
| **Next.js Frontend** | Two-screen UX: App List → App Detail graph with ResourceDrawer |

## Key design decisions

- **Full rebuild on every change** — simpler than incremental diffing; the graph is small (tens to low hundreds of nodes in practice) so rebuilding is cheap.
- **SSE over WebSockets** — SSE is unidirectional, trivially proxied by nginx/Cilium Gateway, and natively reconnecting in browsers.
- **Two-screen UX (no namespace sidebar)** — operators care about *what they deployed*, not which namespace it lives in. The App List surfaces every `Kustomization` and `HelmRelease`; clicking drills into a per-app detail graph with inventory nodes.
- **No database** — current state only. Historical reconciliation tracking is planned (see [Roadmap](../roadmap.md)).

See the [Backend](backend.md) and [Frontend](frontend.md) pages for detailed explanations.
