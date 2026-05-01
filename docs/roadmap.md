# Roadmap

Xafrun is under active development. Below is the outward-facing roadmap, organised into six tracks (A–F). Items within each track are roughly prioritised top-to-bottom.

!!! note
    This is the current plan; it may change based on feedback and contributions. Check the [GitHub issues](https://github.com/omilun/Xafrun/issues) for the most up-to-date status.

## Track A — Graph fidelity

- [ ] HelmRelease → parent Kustomization edges
- [ ] `OCIRepository` and `HelmRepository` source nodes
- [ ] Node detail panel (click a node to see full YAML status, inventory list, last-applied revision)
- [ ] Kustomization `dependsOn` edges

## Track B — History & persistence

- [ ] PostgreSQL backend (CloudNativePG) for reconciliation history
- [ ] Timeline sidebar: browse past reconciliation events per resource
- [ ] Retention policy configuration

## Track C — Log streaming

- [ ] Stream controller logs (source/kustomize/helm) for a selected resource
- [ ] Stream Pod logs from Kustomization inventory items
- [ ] Log search / filter

## Track D — Multi-cluster

- [ ] Aggregate Flux state from multiple clusters via a hub-spoke model
- [ ] Per-cluster colour coding in the graph
- [ ] Cluster switcher in the sidebar

## Track E — Authentication & authorisation

- [ ] Built-in OIDC / OAuth2 support
- [ ] Read-only vs admin role distinction (for future write operations)
- [ ] Audit log for dashboard access

## Track F — Developer experience

- [x] Helm chart published as OCI artefact to the in-cluster Zot registry
- [ ] OCI chart on `ghcr.io/omilun/charts/xafrun`
- [ ] GitHub Actions CI with automated image builds and chart releases
- [ ] `flux` CLI plugin (`flux dashboard`)
