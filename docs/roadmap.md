# Roadmap

Xafrun is under active development. Below is the outward-facing roadmap, organised into six
tracks (A–F). Items within each track are roughly prioritised top-to-bottom.

!!! note
    This is the current plan; it may change based on feedback and contributions.
    Check the [GitHub issues](https://github.com/omilun/Xafrun/issues) for the most up-to-date status.

## Track A — Graph fidelity

- [x] HelmRelease nodes visible in the app list
- [x] Node detail panel — **ResourceDrawer** with Overview / YAML / Events / Logs tabs
- [x] Kustomization inventory parsed into K8s resource child nodes in the detail graph
- [x] Category-coloured inventory node stripes (Workloads / Services / Networking / Config / RBAC)
- [ ] `OCIRepository` and `HelmRepository` source nodes
- [ ] Kustomization `dependsOn` edges
- [ ] HelmRelease → parent Kustomization edges

## Track B — History & persistence

- [ ] PostgreSQL backend for reconciliation history (optional sidecar)
- [ ] Timeline sidebar: browse past reconciliation events per resource
- [ ] Retention policy configuration

## Track C — Log streaming

- [x] Live Pod log stream from inventory items (`GET /api/logs/:namespace/:name` — SSE)
- [ ] Stream Flux controller logs (source-controller, kustomize-controller, helm-controller)
- [ ] Log search / filter

## Track D — Multi-cluster

- [ ] Aggregate Flux state from multiple clusters via a hub-spoke model
- [ ] Per-cluster colour coding in the graph
- [ ] Cluster switcher in the UI

## Track E — Authentication & authorisation

- [ ] Built-in OIDC / OAuth2 support
- [ ] Read-only vs admin role distinction
- [ ] Audit log for dashboard actions

## Track G — Mutations (write operations)

- [x] **Reconcile** — trigger Flux reconciliation via annotation patch
- [x] **Suspend / Resume** — pause and resume Flux resource reconciliation
- [ ] YAML edit + apply (write changes back to the cluster)
- [ ] Git-vs-cluster diff view

## Track F — Developer experience

- [x] Helm chart (`charts/xafrun/`)
- [x] Kustomize bundle (`deploy/`)
- [ ] OCI chart published to `ghcr.io/omilun/charts/xafrun`
- [ ] GitHub Actions CI (build + test + publish)
- [ ] `flux` CLI plugin (`flux dashboard`)
