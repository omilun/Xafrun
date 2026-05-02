<div align="center">

# Xafrun ☸️

**See your Flux.** A real-time, visual GitOps dashboard for [Flux CD](https://fluxcd.io).

[![Built in-cluster](https://img.shields.io/badge/CI-Argo%20Workflows-EF7B4D?logo=argo)](https://github.com/omilun/Talos-on-macos/tree/main/gitops/apps/xafrun/ci)
[![Go Report Card](https://goreportcard.com/badge/github.com/omilun/xafrun)](https://goreportcard.com/report/github.com/omilun/xafrun)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Helm](https://img.shields.io/badge/Helm-chart-0F1689?logo=helm)](charts/xafrun)

<!-- TODO: replace with a real screenshot once available -->
<!-- ![Xafrun dashboard](docs/assets/dashboard.png) -->

</div>

---

Flux CD is a world-class GitOps engine, but its visibility is fragmented across
the CLI and a handful of general-purpose dashboards. **Xafrun** is the
missing visual bridge — an Argo-style resource tree that shows, at a glance,
how your Git sources flow into Kustomizations and HelmReleases, what's
healthy, and what's broken.

## ✨ Features

- 🗂️ **App List** — ArgoCD-style card grid of every `Kustomization` and `HelmRelease` deployed
  via Flux. Search, filter by health, and see status at a glance.
- 🔍 **App Detail graph** — click any app to open a React Flow dependency graph:
  `GitRepository → Kustomization → inventory K8s resources` (Deployments, Services, Secrets…).
- 📄 **ResourceDrawer** — click any node to see its YAML, Kubernetes events, and Pod logs
  in a tabbed side-panel.
- ⚡ **Real-time updates over SSE** — driven by Kubernetes informers, no polling.
- 🔧 **Reconcile / Suspend / Resume** — trigger Flux actions directly from the UI.
- 📰 **Status ticker** — collapsible bottom bar that pulses red on errors and
  scrolls cluster metadata (K8s / Flux / CNI / OS versions) when healthy.
- 🪶 **Lightweight** — a single Go service + a small Next.js pod.
  Read-only RBAC (plus patch for Flux CRDs), hardened security context, signed images with SBOMs.

## 🚀 Quick start

### Helm (recommended)

```bash
# Install from public OCI registry (GitHub Container Registry)
helm install xafrun oci://ghcr.io/omilun/charts/xafrun \
  --version 0.2.0 \
  --namespace xafrun --create-namespace
```

> Self-hosted cluster? Pull from the in-cluster Zot registry instead:
> ```bash
> helm install xafrun oci://registry.<your-cluster>/charts/xafrun \
>   --version 0.2.0 --namespace xafrun --create-namespace
> ```

Then port-forward:

```bash
kubectl -n xafrun port-forward svc/xafrun-frontend 3000:80
open http://localhost:3000
```

### Kustomize

```bash
kubectl apply -k github.com/omilun/Xafrun//deploy?ref=v0.1.0
```

### Local development

```bash
git clone https://github.com/omilun/Xafrun.git
cd Xafrun
make run                       # backend :8080, frontend :3000
```

Full installation guide → [docs/getting-started/quick-start.md](docs/getting-started/quick-start.md)

## 🆚 How does it compare?

| Capability                       | Xafrun | `flux` CLI | Weave GitOps OSS | Capacitor | Headlamp |
|----------------------------------|:--------:|:----------:|:----------------:|:---------:|:--------:|
| App list (card grid)             |    ✅    |     —      |        ✅        |    ✅     |    —     |
| Visual dependency graph          |    ✅    |     —      |        ✅        |    ✅     |    —     |
| Real-time push (no polling)      |    ✅    |     —      |        —         |    —      |    —     |
| YAML viewer                      |    ✅    |     ✅     |        ✅        |    ✅     |    ✅    |
| Kubernetes events viewer         |    ✅    |     ✅     |        ✅        |    ✅     |    ✅    |
| Pod log streaming                |    ✅    |     ✅     |        ✅        |    ✅     |    ✅    |
| Reconcile / suspend buttons      |    ✅    |     ✅     |        ✅        |    ✅     |    —     |
| Flux-native (only Flux noise)    |    ✅    |     ✅     |        ✅        |    ✅     |    —     |
| Lightweight (single SA, < 200Mi) |    ✅    |     ✅     |        —         |    ✅     |    —     |
| Multi-cluster                    |    🛣️    |     —      |        ✅        |    —      |    ✅    |
| Auth (OIDC)                      |    🛣️    |     —      |        ✅        |    —      |    ✅    |

🛣️ = on the [roadmap](docs/roadmap.md).

## 📐 Architecture

```mermaid
flowchart LR
  K8s[Kubernetes API] -->|Informers| W[Watcher<br/>controller-runtime]
  W -->|in-memory graph| API[Gin REST + SSE]
  API -->|/api/tree · /api/events\n/api/yaml · /api/k8sevents\n/api/logs [SSE]\nPOST reconcile|suspend|resume| FE[Next.js Frontend]
  FE -->|App List → App Detail\nReact Flow + dagre\nResourceDrawer| User((👤 You))
```

- **Backend:** Go 1.26 service. `controller-runtime` informers feed an
  in-memory graph; every change triggers a rebuild and a broadcast to SSE
  subscribers. Write actions (reconcile/suspend/resume) use `client.MergeFrom`
  patches against the Flux CRD types.
- **Frontend:** Next.js 16 (App Router) + React 19. Two-screen UX: an App List
  card grid (default) → an App Detail React Flow graph per app → a ResourceDrawer
  with YAML, Events, and Logs tabs.

Architecture deep-dive → [Architecture overview](https://github.com/omilun/Xafrun/blob/master/docs/architecture/overview.md)

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

### How CI works (no GitHub Actions)

Xafrun is built and released by an **in-cluster pipeline** running on
[Argo Workflows](https://argoproj.github.io/argo-workflows/) + [Argo Events](https://argoproj.github.io/argo-events/) +
[BuildKit](https://github.com/moby/buildkit), with images pushed to a
[Zot](https://zotregistry.dev/) OCI registry inside the cluster.

The pipeline definitions live in
[`Talos-on-macos/gitops/apps/xafrun/ci/`](https://github.com/omilun/Talos-on-macos/tree/main/gitops/apps/xafrun/ci):

| Trigger | Workflow | What it does |
|---|---|---|
| `push` to `master` | `xafrun-test` → `xafrun-build` → `xafrun-scan` | Lint + tests, multi-arch images, Trivy scan |
| `tag` `v*.*.*` | `xafrun-release` | Tagged images, cosign signing, Helm OCI push |
| Daily 06:00 UTC | `xafrun-nightly-scan` (CronWorkflow) | Trivy CVE re-scan |
| `push` to `master` (docs) | `xafrun-docs` | Build MkDocs site, publish to docs gateway |

## 🛣️ Roadmap

The high-level roadmap is published at [docs/roadmap.md](docs/roadmap.md). Upcoming highlights:

- All Flux CRDs (OCIRepository, Bucket, ImagePolicy, Receiver, Alert…)
- YAML edit + apply (write changes back to the cluster)
- OIDC auth + RBAC-filtered graph
- Multi-cluster (Argo-style)
- Reconciliation history (CNPG-backed)

## 📜 License

MIT — see [LICENSE](LICENSE).

---

<div align="center">
Made with ❤️ for the Flux community.
</div>
