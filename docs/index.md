# Fluxbaan: see your Flux.

**Fluxbaan** is a real-time visual GitOps dashboard for [Flux CD](https://fluxcd.io). It turns the abstract dependency chain of Flux resources into an interactive, colour-coded graph — so you can understand the state of your entire GitOps pipeline at a glance, without running a single `kubectl` command.

<!-- Screenshots will live in docs/assets/ once the project reaches beta. A dashboard screenshot (`assets/dashboard.png`) will be placed here. -->

## Why Fluxbaan?

Flux is a world-class GitOps engine, but its built-in visibility story is fragmented: CLIs for power users, generic dashboards cluttered with non-GitOps noise, and no first-class dependency graph. Fluxbaan fills that gap.

## Features

- **Real-time dependency graph** — GitRepository → Kustomization → HelmRelease, laid out automatically with dagre, updated the moment anything changes.
- **Live health colours** — Healthy (green), Progressing (yellow), Unhealthy (red), and Unknown (grey) mapped directly from Flux `Ready` conditions.
- **Namespace filtering** — select one or more namespaces; parent nodes are kept visible via ancestor walk so the chain never breaks.
- **Cluster status ticker** — a collapsible footer bar showing Kubernetes, Flux, Talos, and Cilium versions when healthy, or an error summary when things go wrong.

## Quick links

| | |
|---|---|
| 🚀 **[Quick Start](getting-started/quick-start.md)** | Up and running in 60 seconds with kind |
| 📦 **[Helm install](getting-started/install-helm.md)** | Production-ready installation |
| 🏗️ **[Architecture](architecture/overview.md)** | How the backend and frontend fit together |
| 📡 **[API Reference](api/rest.md)** | REST endpoints and SSE stream |

---

!!! tip "Alpha software"
    Fluxbaan is in early development. The graph and status ticker work well in practice, but some advanced features (log streaming, multi-cluster, auth) are on the [roadmap](roadmap.md). See the [FAQ](faq.md) for more.
