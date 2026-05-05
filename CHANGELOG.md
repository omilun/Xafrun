# Changelog

All notable changes to Xafrun will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.1] - 2026-05-04

### Added
- **Kustomization source URL** — AppCard for Kustomizations now resolves the upstream
  `GitRepository`/`OCIRepository`/`HelmRepository` `spec.url` and displays
  `github.com/org/repo @ abc1234` (short 7-char SHA) instead of the opaque
  `GitRepository/flux-system` object reference.

### Changed
- **NewsTicker** — inline mode redesigned as accordion: collapsed state shows only a
  colour-coded TowerControl icon (green = healthy, red = error); clicking expands a panel
  with full error details or the cluster info grid.
- **Toolbar** — StatPill total/healthy/unhealthy counters removed; filter chips already
  display live counts, making the pills redundant.

### Fixed
- ESLint 10 compatibility: set `settings.react.version = '19'` in `eslint.config.mjs` so
  `eslint-plugin-react` does not call `context.getFilename()` (removed in ESLint 10) during
  React version auto-detection.
- Removed unused `Position` import in `FluxTree.tsx`.

## [0.2.0] - 2026-05-01

### Changed
- **Graph nodes** redesigned — clean rectangular cards; border colour = health status
  (green=ready, red=error, amber=progressing, grey=unknown); TYPE label uppercase and bold;
  8 px status dot top-right; no colour bar.
- **FluxTree layout** tuned: `ranksep 220`, `nodesep 100`, `NODE_WIDTH 260`, `NODE_HEIGHT 80`.
- **Cluster info** fully generic — CNI version scanned from DaemonSets cluster-wide
  (Cilium, Calico, Flannel, Weave, Canal, kube-router); ingress controller detected from
  Deployments and DaemonSets (nginx/traefik/gateway/istio/contour/kong/envoy);
  OS image from `NodeInfo.OSImage` (works on Talos, Ubuntu, Bottlerocket, etc.).
- Default `clusterName` changed from a hardcoded value to `"kubernetes"`.

## [0.1.8] - 2026-05-04

### Added
- **Logo** — custom Xafrun logo in the header, replacing the generic icon.
- **StatPill counters** — Total / Healthy / Unhealthy / Progressing counts in the toolbar.

### Changed
- Header branding updated: larger font, "GitOps Visualization" subtitle.
- Logo image compressed (256×256 px) for fast page load.
- Proxy backend URL discovery: explicit `BACKEND_URL` env var → in-cluster service name
  → localhost fallback. Request timeout increased to 10 s.

### Fixed
- Broken JSX structure in `page.tsx` (missing closing `</div>` introduced in 0.1.7).
- Missing `StatPill` component definition.
- `X` icon accidentally removed from lucide-react imports.

## [0.1.7] - 2026-05-03

### Changed
- **Header logo** updated to use `next/image` with `/logo.png`.
- Status ticker relocated from the bottom overlay to an inline chip in the filter toolbar.
- Filter toolbar now shows live count chips (All / Healthy / Unhealthy / Progressing).

## [0.1.6] - 2026-05-03

### Changed — Frontend

- **ArgoCD-style graph hierarchy** — App Detail view uses TB (top-down) layout with a
  unified Dagre graph: Source → App → K8s inventory spread across the bottom.
  Edges fan out naturally; main overview retains LR (left-right) layout.
  All edges use `smoothstep` curves.
- **Category-coloured K8s inventory nodes** — each node has a left accent stripe by category:
  - 🔵 Workloads (Deployment, StatefulSet, DaemonSet, Job, CronJob, Pod)
  - 🩵 Services
  - 🟢 Networking (Ingress, IngressRoute, HTTPRoute, Gateway)
  - 🟡 Config (ConfigMap, Secret, PVC)
  - 🩷 RBAC (ClusterRole, ClusterRoleBinding, Role, RoleBinding, ServiceAccount)
  - 🩵 Cert-manager (Certificate, Issuer, ClusterIssuer)
- **Flux node accent stripes** — each Flux kind has a colour-coded left stripe and badge.
- **Dynamic handle positions** — LR layout uses Left/Right handles; TB uses Top/Bottom.

### Fixed
- Duplicate `const invEdges` declaration in `FluxTree.tsx` causing Turbopack build failure.
- Proxy catch-all route now handles all HTTP methods correctly.

## [0.1.5] - 2026-05-02

### Added
- **App List** (Screen 1) — ArgoCD-style card grid of every `Kustomization` and `HelmRelease`.
  Orchestrator Kustomizations are hidden; only deployable leaf apps are shown.
  Cards show: kind badge, name, namespace, health (border colour), sync status, source ref, last sync.
- **App Detail** (Screen 2) — full-screen React Flow graph per app.
  Nodes: Source → App → inventory K8s resources parsed from `node.inventory[]`.
- **ResourceDrawer** — tabbed side-panel (Overview / YAML / Events / Logs) opened by clicking any node.
- **CommandPalette** — `Cmd+K` / `Ctrl+K` quick-navigation to any app.
- **ThemeToggle** — dark / light mode switch.
- **Filter chips with live counts** — All / Healthy / Unhealthy / Progressing.

### Added — Backend
- `GET /api/yaml/:kind/:namespace/:name` — YAML for any Flux or K8s resource (managed-fields stripped).
- `GET /api/k8sevents/:kind/:namespace/:name` — Kubernetes events for a resource.
- `GET /api/logs/:namespace/:name` — SSE stream of Pod log lines.
- `POST /api/reconcile/:kind/:namespace/:name` — triggers Flux reconciliation via annotation patch.
- `POST /api/suspend/:kind/:namespace/:name` — patches `spec.suspend: true`.
- `POST /api/resume/:kind/:namespace/:name` — patches `spec.suspend: false`.

### Fixed
- Reconcile patch now uses `client.MergeFrom` (preserves existing annotations).
- Suspend/Resume uses typed switch over concrete Flux types (fixes HelmRepository/HelmChart).
- `GetK8sEvents` uses native `CoreV1().Events()` instead of controller-runtime List with field indexer.
- Frontend: `204 No Content` responses from reconcile/suspend/resume no longer cause parse errors.

## [0.1.4] - 2026-05-01

### Added
- Generic cluster info discovery — backend detects CNI, ingress controller, and OS image
  from the Kubernetes API. No platform-specific assumptions.
- `CLUSTER_NAME` env var (default: `"kubernetes"`) overrides the name shown in the status ticker.
- ArtifactHub metadata (`artifacthub-repo.yml`).
- Helm chart at `charts/xafrun/` with full values, optional Ingress / Gateway HTTPRoute /
  NetworkPolicy, and security-hardened defaults.
- Kustomize bundle at `deploy/` as an alternative install method.
- MkDocs Material documentation site under `docs/`.
- Backend unit tests: 95.7% coverage (`pkg/api`), 75.9% (`pkg/watcher`).
- `.github/dependabot.yml` and `renovate.json` for Go, npm, and Docker dependency updates.

### Changed
- Default cluster name changed from a hardcoded value to `"kubernetes"`.
- Graph node cards redesigned — clean rectangular cards, border colour = health status.
- Layout tuned: `ranksep 220`, `nodesep 100`.
- README rewritten with badges, comparison table, and accurate prerequisites.

### Removed
- Hardcoded platform references from backend and frontend.

### Fixed
- Nil-pointer guard in `pkg/watcher/watcher.go` for `r.Status.Artifact` and `hr.Spec.Chart`.

## [0.1.0] - 2026-05-01

### Added
- Initial public release.
- Real-time visualisation of `GitRepository`, `Kustomization`, and `HelmRelease`.
- React Flow + dagre top-down dependency graph.
- Server-Sent Events (`/api/events`) for live updates.
- REST endpoints `/api/tree`, `/api/info`.
- Status ticker with Kubernetes, Flux, CNI, and OS version metadata.

[Unreleased]: https://github.com/omilun/Xafrun/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/omilun/Xafrun/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/omilun/Xafrun/compare/v0.1.8...v0.2.0
[0.1.8]: https://github.com/omilun/Xafrun/compare/v0.1.7...v0.1.8
[0.1.7]: https://github.com/omilun/Xafrun/compare/v0.1.6...v0.1.7
[0.1.6]: https://github.com/omilun/Xafrun/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/omilun/Xafrun/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/omilun/Xafrun/compare/v0.1.0...v0.1.4
[0.1.0]: https://github.com/omilun/Xafrun/releases/tag/v0.1.0
