<div align="center">

# Fluxbaan ☸️

**See your Flux.** A real-time, visual GitOps dashboard for [Flux CD](https://fluxcd.io).

[![CI](https://github.com/omilun/Fluxbaan/actions/workflows/ci.yml/badge.svg)](https://github.com/omilun/Fluxbaan/actions/workflows/ci.yml)
[![Release](https://github.com/omilun/Fluxbaan/actions/workflows/release.yml/badge.svg)](https://github.com/omilun/Fluxbaan/actions/workflows/release.yml)
[![Trivy](https://github.com/omilun/Fluxbaan/actions/workflows/scan.yml/badge.svg)](https://github.com/omilun/Fluxbaan/actions/workflows/scan.yml)
[![Docs](https://github.com/omilun/Fluxbaan/actions/workflows/docs.yml/badge.svg)](https://omilun.github.io/Fluxbaan/)
[![Go Report Card](https://goreportcard.com/badge/github.com/omilun/fluxbaan)](https://goreportcard.com/report/github.com/omilun/fluxbaan)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Helm](https://img.shields.io/badge/Helm-chart-0F1689?logo=helm)](charts/fluxbaan)

<!-- TODO: replace with a real screenshot once available -->
<!-- ![Fluxbaan dashboard](docs/assets/dashboard.png) -->

</div>

---

Flux CD is a world-class GitOps engine, but its visibility is fragmented across
the CLI and a handful of general-purpose dashboards. **Fluxbaan** is the
missing visual bridge — an Argo-style resource tree that shows, at a glance,
how your Git sources flow into Kustomizations and HelmReleases, what's
healthy, and what's broken.

## ✨ Features

- 📊 **Visual dependency graph** — `GitRepository → Kustomization → HelmRelease`,
  laid out top-to-bottom by [dagre](https://github.com/dagrejs/dagre) on top of
  [React Flow](https://reactflow.dev).
- ⚡ **Real-time updates over SSE** — driven by Kubernetes informers, no polling.
- 🎯 **Namespace filtering with ancestor walk** — pick `apps`, the source in
  `flux-system` stays visible because it's a parent.
- 📰 **Status ticker** — collapsible bottom bar that pulses red on errors and
  scrolls cluster metadata (K8s / Flux / Talos / Cilium versions) when healthy.
- 🪶 **Lightweight** — a single Go service + a small Next.js pod.
  Read-only RBAC, hardened security context, signed images with SBOMs.

## 🚀 Quick start

### Helm (recommended)

```bash
helm repo add fluxbaan https://omilun.github.io/Fluxbaan
helm repo update

helm install fluxbaan fluxbaan/fluxbaan \
  --namespace fluxbaan --create-namespace
```

Then port-forward:

```bash
kubectl -n fluxbaan port-forward svc/fluxbaan-frontend 3000:80
open http://localhost:3000
```

### Kustomize

```bash
kubectl apply -k github.com/omilun/Fluxbaan//deploy?ref=v0.1.0
```

### Local development

```bash
git clone https://github.com/omilun/Fluxbaan.git
cd Fluxbaan
make run                       # backend :8080, frontend :3000
```

Full installation guide → <https://omilun.github.io/Fluxbaan/getting-started/quick-start/>

## 🆚 How does it compare?

| Capability                       | Fluxbaan | `flux` CLI | Weave GitOps OSS | Capacitor | Headlamp |
|----------------------------------|:--------:|:----------:|:----------------:|:---------:|:--------:|
| Visual dependency graph          |    ✅    |     —      |        ✅        |    ✅     |    —     |
| Real-time push (no polling)      |    ✅    |     —      |        —         |    —      |    —     |
| Namespace-scoped filter          |    ✅    |     ✅     |        ✅        |    ✅     |    ✅    |
| Flux-native (only Flux noise)    |    ✅    |     ✅     |        ✅        |    ✅     |    —     |
| Lightweight (single SA, < 200Mi) |    ✅    |     ✅     |        —         |    ✅     |    —     |
| Reconcile / suspend buttons      |    🛣️    |     ✅     |        ✅        |    ✅     |    —     |
| Multi-cluster                    |    🛣️    |     —      |        ✅        |    —      |    ✅    |
| Auth (OIDC)                      |    🛣️    |     —      |        ✅        |    —      |    ✅    |

🛣️ = on the [roadmap](https://omilun.github.io/Fluxbaan/roadmap/).

## 📐 Architecture

```mermaid
flowchart LR
  K8s[Kubernetes API] -->|Informers| W[Watcher<br/>controller-runtime]
  W -->|in-memory graph| API[Gin REST + SSE]
  API -->|/api/tree<br/>/api/events<br/>/api/info| FE[Next.js Frontend]
  FE -->|React Flow + dagre| User((👤 You))
```

- **Backend:** Go 1.26 service. `controller-runtime` informers feed an
  in-memory graph; every change triggers a rebuild and a broadcast to SSE
  subscribers.
- **Frontend:** Next.js 16 (App Router) + React 19. The `/api/*` routes proxy
  to the backend; the page subscribes to `/api/events` via `EventSource`.

Architecture deep-dive → <https://omilun.github.io/Fluxbaan/architecture/overview/>

## 📦 Prerequisites

| Tool                       | Version                       |
|----------------------------|-------------------------------|
| Kubernetes                 | 1.28+                         |
| [Flux CD](https://fluxcd.io) | v2.x                        |
| Go (for local builds)      | 1.26+                         |
| Node.js (for local builds) | 22+                           |

## 🤝 Contributing

We welcome contributions of any size — bug reports, doc fixes, new features.
See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines,
and our [Code of Conduct](CODE_OF_CONDUCT.md).

For security issues, please follow the disclosure process in [SECURITY.md](SECURITY.md).

## 🛣️ Roadmap

The high-level roadmap is published at
<https://omilun.github.io/Fluxbaan/roadmap/>. Highlights:

- All Flux CRDs (OCIRepository, Bucket, ImagePolicy, Receiver, Alert…)
- Reconcile / suspend / YAML drawer / Git-vs-cluster diff
- OIDC auth + RBAC-filtered graph
- Multi-cluster (Argo-style)
- Reconciliation history (CNPG-backed)

## 📜 License

MIT — see [LICENSE](LICENSE).

---

<div align="center">
Made with ❤️ for the Flux community.
</div>
