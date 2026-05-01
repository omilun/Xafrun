# Contributing to Fluxbaan

First — thank you for considering a contribution. Fluxbaan is an open-source
project that lives or dies by its community, and every issue, bug report, doc
fix and PR helps.

This document explains how to get set up, what we expect from contributions,
and how to navigate the codebase.

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md) v2.1. By
participating you agree to uphold its terms.

## Ways to contribute

- **🐛 File a bug** — use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml).
- **💡 Suggest a feature** — use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.yml).
- **❓ Ask a question** — use [GitHub Discussions](https://github.com/omilun/Fluxbaan/discussions).
- **📝 Improve documentation** — every page under `docs/` is fair game.
- **🧪 Add tests** — coverage is tracked in CI; see `backend/pkg/*_test.go` for examples.
- **✨ Submit a feature PR** — please open an issue first to discuss the design.

## Development setup

### Prerequisites

| Tool          | Version |
|---------------|---------|
| Go            | 1.26+   |
| Node.js       | 22+     |
| Docker        | 24+ (optional, for image builds) |
| Helm          | 3.14+ (optional, for chart work) |
| kubectl       | 1.28+   |
| A Kubernetes cluster with Flux v2 | (kind works great) |

### Clone and run

```bash
git clone https://github.com/omilun/Fluxbaan.git
cd Fluxbaan

# Backend talks to whichever cluster your current kubeconfig points at.
make run                       # runs backend on :8080 + frontend on :3000
```

Open <http://localhost:3000>.

### Layout

```
.
├── backend/              # Go service — informers + SSE
│   ├── main.go
│   ├── pkg/api/          # Gin HTTP handlers
│   ├── pkg/watcher/      # In-memory graph + broadcaster
│   ├── pkg/k8s/          # client-go bootstrap
│   └── pkg/models/       # Plain DTOs shared with the frontend
├── frontend/             # Next.js 16 + React Flow
│   └── src/
│       ├── app/          # App Router routes (incl. /api/* proxies)
│       ├── components/   # FluxTree, Sidebar, NewsTicker
│       └── types/        # TS mirror of backend models
├── charts/fluxbaan/      # Helm chart (primary distribution)
├── deploy/               # Kustomize bundle (alternative)
├── docs/                 # MkDocs Material content
└── .github/workflows/    # CI, release, scan, docs
```

## Branching & commits

- Branch off `master` (we use `master`, not `main`, for historical reasons).
- Use **conventional commits**:
  - `feat: …` — new user-visible feature
  - `fix: …` — bug fix
  - `docs: …` — documentation only
  - `refactor: …` — internal change with no behaviour change
  - `test: …` — tests only
  - `chore: …` — tooling, deps, build
- Keep commits focused. Multiple small commits are easier to review than one
  giant commit.

## Pull requests

1. Open an issue first if your change is non-trivial.
2. Fork and branch.
3. Make the change.
4. Add or update tests.
5. Update relevant docs under `docs/` (and the values table in
   `charts/fluxbaan/README.md` if you touched the chart).
6. Run the local checks below.
7. Open a PR against `master`. Fill in the template.
8. Address review feedback by pushing more commits to the same branch — we
   squash on merge.

> **CI runs in-cluster** (Argo Workflows on the maintainer's Talos cluster) —
> there are no GitHub Actions workflows. The pipeline lives in
> [`Talos-on-macos/gitops/apps/fluxbaan/ci/`](https://github.com/omilun/Talos-on-macos/tree/main/gitops/apps/fluxbaan/ci).
> A maintainer will trigger it for your PR. Please **always run the local
> checks below before opening a PR** — they exactly mirror what runs in the
> cluster.

## Local checks (must all pass before pushing)

### Backend

```bash
cd backend
go vet ./...
go test ./... -race -cover
go build ./...
# Optional but recommended:
golangci-lint run
```

### Frontend

```bash
cd frontend
npm ci
npm run lint
npm run build
```

### Helm chart (only if you touched `charts/`)

```bash
helm lint charts/fluxbaan
helm template charts/fluxbaan
```

### Docs (only if you touched `docs/` or `mkdocs.yml`)

```bash
pip install -r requirements-docs.txt
mkdocs build --strict
```

## Reporting security issues

Please **do not** file public issues for security vulnerabilities. See
[SECURITY.md](SECURITY.md) for the disclosure process.

## License

By contributing you agree that your contributions will be licensed under the
MIT license that covers the project (see [LICENSE](LICENSE)).

---

Thank you again. Every contribution — even a one-line typo fix — is valued.
