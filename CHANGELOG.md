# Changelog

All notable changes to Fluxbaan will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- LICENSE file (MIT) matching the README declaration.
- `.gitignore` covering Go, Node, MkDocs and Helm artefacts.
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`.
- GitHub issue templates (bug / feature / question) with Discussions link.
- Pull request template and `CODEOWNERS`.
- `.github/dependabot.yml` covering gomod, npm, github-actions and docker.
- GitHub Actions:
  - `ci.yml` — Go vet/test/build, golangci-lint, npm ci/lint/build, helm lint, multi-arch docker build (no push).
  - `release.yml` — multi-arch image build & push to GHCR with cosign keyless signing, SBOM attestation, GitHub Release notes, Helm chart publishing via `chart-releaser`.
  - `scan.yml` — daily Trivy filesystem and image scans, SARIF upload to Code Scanning.
  - `docs.yml` — MkDocs Material build & deploy to GitHub Pages.
- Helm chart at `charts/fluxbaan/` with full values, optional Ingress / Gateway HTTPRoute / NetworkPolicy, security-hardened defaults.
- Kustomize bundle at `deploy/` as an alternative install method.
- MkDocs Material documentation site under `docs/` (Getting Started, User Guide, Architecture, API, Contributing, Roadmap, Comparison, FAQ).
- Backend unit tests (`pkg/watcher`, `pkg/api`) using controller-runtime fake client and httptest. Coverage: 95.7% (`pkg/api`), 75.9% (`pkg/watcher`).

### Changed

- README rewritten with badges, screenshot placeholders, comparison table, and accurate Go 1.26 / Node 22 prerequisites.
- DESIGN.md updated to reflect the SSE + Informer architecture (replaces the original TanStack-polling design).

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

[Unreleased]: https://github.com/omilun/Fluxbaan/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/omilun/Fluxbaan/releases/tag/v0.1.0
