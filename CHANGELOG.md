# Changelog

All notable changes to Xafrun will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0]

### Changed — Frontend (ArgoCD-style redesign)

- **Namespace sidebar removed.** The sidebar-driven namespace filter is gone. The new two-screen layout
  is clearer and more consistent with how operators think about GitOps resources.
- **App List** (Screen 1, default view) — a responsive card grid showing every `Kustomization` and
  `HelmRelease` deployed via Flux. Orchestrator / parent Kustomizations (e.g. `flux-system/apps`,
  `flux-system/infrastructure`) are hidden — only "leaf" apps are shown.
  Cards display: kind badge, name, namespace, health status (border colour), sync status, source ref,
  and last sync time. Top filter bar: search by name + health filter (All / Healthy / Unhealthy).
- **App Detail** (Screen 2) — full-screen React Flow graph for a single app.
  Nodes: Source → App → inventory K8s resources (Deployments, Services, ConfigMaps, Secrets…).
  Inventory entries are parsed from the Kustomization `node.inventory[]` ID format
  (`{namespace}_{name}_{group}_{kind}`).
- **ResourceDrawer** — tabbed side-panel opened by clicking any node in the detail graph or any card:
  - *Overview* — status badge, last sync message, Reconcile / Suspend / Resume buttons, metadata.
  - *YAML* — fetches `GET /api/yaml/:kind/:namespace/:name`, syntax-highlighted read-only YAML.
  - *Events* — fetches `GET /api/k8sevents/:kind/:namespace/:name`, k8s event list
    (type / reason / message / count / age).
  - *Logs* — streams `GET /api/logs/:namespace/:name` via SSE for Pod resources.

### Added — Backend

- `GET /api/yaml/:kind/:namespace/:name` — returns YAML for any Flux or k8s resource
  (managed-fields stripped). Flux resources use the typed client; k8s resources use the
  unstructured client with server-side group/version discovery.
- `GET /api/k8sevents/:kind/:namespace/:name` — returns Kubernetes events for a resource using
  the native `CoreV1().Events()` API with a field selector (`involvedObject.name=<name>`).
  Switched from controller-runtime List (which requires a registered field indexer) to the native
  client for reliable field-selector support.
- `GET /api/logs/:namespace/:name` — SSE stream of Pod log lines.
- `POST /api/reconcile/:kind/:namespace/:name` — triggers Flux reconciliation by patching the
  `reconcile.fluxcd.io/requestedAt` annotation via `client.MergeFrom` (fixes the previous
  raw JSON patch that dropped existing annotations).
- `POST /api/suspend/:kind/:namespace/:name` — patches `spec.suspend: true` via typed switch
  (fixes the previous raw JSON patch which failed for some resource types).
- `POST /api/resume/:kind/:namespace/:name` — patches `spec.suspend: false`.

### Fixed

- Reconcile annotation patch now uses `client.MergeFrom` instead of raw JSON, preserving
  existing annotations.
- Suspend/Resume now uses a typed `switch` over the concrete Flux type instead of raw JSON,
  fixing failures for `HelmRepository`, `HelmChart`, and image controller types.
- `GetK8sEvents` — switched from controller-runtime `List` with a field indexer to the native
  `CoreV1().Events()` call; adds structured logging on error.
- Frontend: API proxy routes now handle HTTP 204 No Content correctly (previously returned a
  parse error to the client when reconcile/suspend/resume returned no body).



### Added
- **ArtifactHub metadata** (`artifacthub-repo.yml`) for public chart discovery.
- Public Helm OCI install: `helm install xafrun oci://ghcr.io/omilun/charts/xafrun --version 0.2.0`

### Changed
- **Generic cluster info** — backend now discovers CNI, ingress controller, and OS
  image by querying the Kubernetes API directly. No platform-specific assumptions
  (works on any distro: Talos, Ubuntu, Bottlerocket, etc.).
- `ClusterInfo.TalosVersion` → `osImage` (raw `NodeInfo.OSImage` from any node).
- `ClusterInfo.CiliumVersion` → `cniVersion` (auto-detected: Cilium, Calico, Flannel, Weave…).
- `IngressController` — auto-detected from cluster DaemonSets/Deployments (cilium-gateway,
  ingress-nginx, Traefik, Istio, Contour, Kong…).
- Default cluster name changed from `"talos-tart-ha"` → `"kubernetes"` (override with
  `CLUSTER_NAME` env var).
- **Graph node cards** redesigned — clean rectangular cards, border color = status,
  TYPE label uppercase, no left color bar (matches flux-operator visual style).
- **Layout** — more breathing room: `ranksep 220`, `nodesep 100`.
- **News ticker** — now starts **closed by default**; auto-opens when any resource
  is unhealthy; updated ticker text uses generic field names.

### Removed
- Hardcoded references to Talos Linux and Cilium from backend and frontend.

### Added

- Added LICENSE file (MIT) matching the README declaration.
- `.gitignore` covering Go, Node, MkDocs and Helm artefacts.
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`.
- Issue templates (bug / feature / question) with Discussions link.
- Pull request template and `CODEOWNERS`.
- `.github/dependabot.yml` and `renovate.json` covering gomod, npm and docker.
- **In-cluster CI** via Argo Workflows + Argo Events + BuildKit + Zot (replaces GitHub Actions).
- Helm chart at `charts/xafrun/` with full values, optional Ingress / Gateway HTTPRoute / NetworkPolicy, security-hardened defaults.
- Kustomize bundle at `deploy/` as an alternative install method.
- MkDocs Material documentation site under `docs/`.
- Backend unit tests (`pkg/watcher`, `pkg/api`). Coverage: 95.7% (`pkg/api`), 75.9% (`pkg/watcher`).

### Changed

- README rewritten with badges, comparison table, and accurate Go 1.26 / Node 22 prerequisites.
- DESIGN.md updated to reflect the SSE + Informer architecture.

### Fixed

- Nil-pointer guard in `pkg/watcher/watcher.go` for `r.Status.Artifact` and `hr.Spec.Chart`.

## [0.1.0] - 2026-05-01

### Added

- Initial public release.
- Real-time visualization of `GitRepository`, `Kustomization`, and `HelmRelease`.
- React Flow + dagre top-down dependency graph layout.
- Namespace sidebar with ancestor-aware filtering.
- Collapsible "news ticker" status bar with cluster metadata
  (Kubernetes / Flux / Talos / Cilium versions).
- Server-Sent Events (`/api/events`) for live updates.
- REST endpoints `/api/tree`, `/api/info`.

[Unreleased]: https://github.com/omilun/Xafrun/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/omilun/Xafrun/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/omilun/Xafrun/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/omilun/Xafrun/releases/tag/v0.1.0
