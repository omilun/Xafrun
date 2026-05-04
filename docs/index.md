# Xafrun: see your Flux.

**Xafrun** is a real-time, visual GitOps dashboard for [Flux CD](https://fluxcd.io). It turns the
abstract dependency chain of Flux resources into an interactive, colour-coded graph — so you can
understand the state of your entire GitOps pipeline at a glance, without running a single `kubectl`
command.

## Why Xafrun?

Flux is a world-class GitOps engine, but its built-in visibility story is fragmented: CLIs for
power users, generic dashboards cluttered with non-GitOps noise, and no first-class dependency
graph. Xafrun fills that gap.

## Features

- **App List** — ArgoCD-style card grid of every `Kustomization` and `HelmRelease`. Search,
  filter by health (Healthy / Unhealthy / Progressing), and see live counts at a glance.
- **App Detail graph** — click any app to open a full-screen React Flow dependency graph.
  Layout: `Source → App → K8s inventory resources` (Deployments, Services, Secrets…).
  Nodes are colour-coded by resource category and health status.
- **ResourceDrawer** — click any node for a tabbed side-panel: Overview, YAML, Kubernetes
  Events, and live Pod Logs.
- **Real-time updates** — driven by Kubernetes informers over SSE. No polling, no page refresh.
- **Reconcile / Suspend / Resume** — trigger Flux actions directly from the UI.
- **Status ticker** — inline toolbar chip showing K8s / Flux / CNI / OS versions.
  Turns red and scrolls error details when resources are unhealthy.
- **CommandPalette** — `Cmd+K` / `Ctrl+K` quick navigation to any app.
- **Dark mode** — full dark/light theme support.

## Quick links

| | |
|---|---|
| 🚀 **[Quick Start](getting-started/quick-start.md)** | Up and running in minutes |
| 📦 **[Helm install](getting-started/install-helm.md)** | Production-ready installation |
| 🏗️ **[Architecture](architecture/overview.md)** | How the backend and frontend fit together |
| 📡 **[API Reference](api/rest.md)** | REST endpoints and SSE stream |
| 🛣️ **[Roadmap](roadmap.md)** | What's coming next |

---

!!! tip "Current status"
    Xafrun is under active development (v0.1.8). Core graph visualisation, ResourceDrawer,
    and write actions (reconcile/suspend/resume) are stable. Advanced features (multi-cluster,
    OIDC auth, reconciliation history) are on the [roadmap](roadmap.md).
