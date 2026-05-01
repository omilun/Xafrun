# FAQ

## Why another Flux dashboard?

Existing tools either lack a dependency graph (Weave GitOps OSS, Capacitor), are not Flux-native (Headlamp), or require the CLI (the `flux` command). Xafrun's goal is to be the visual missing piece: an interactive, real-time graph that makes the GitOps lifecycle immediately understandable without any CLI knowledge.

See the [Comparison](comparison.md) page for a detailed breakdown.

---

## How does Xafrun compare to Weave GitOps?

Weave GitOps is a mature, full-featured Flux UI with authentication, log streaming, and (in the enterprise version) multi-cluster support. Xafrun is narrower in scope and lighter weight — it focuses on the dependency graph and real-time health status. They are complementary rather than direct competitors. If you need OIDC and log streaming today, Weave GitOps is the better choice. If you want a fast, graph-first view, try Xafrun.

---

## Does Xafrun work with Flux v1?

No. Xafrun is built exclusively against the **Flux v2** API (`source.toolkit.fluxcd.io`, `kustomize.toolkit.fluxcd.io`, `helm.toolkit.fluxcd.io`). Flux v1 reached end-of-life in November 2022 and is not supported.

---

## Is Xafrun read-only?

Yes, always. Xafrun never writes to the Kubernetes API. Its ClusterRole grants only `get`, `list`, and `watch` verbs. There is no way to trigger a reconciliation or modify resources through the UI.

---

## Is Xafrun ready for production?

Honestly: **alpha quality**. The graph and status ticker work well in practice, but:

- There is no built-in authentication — expose it behind an auth proxy in shared environments.
- The Helm chart and OCI image are not yet published.
- Some planned features (log streaming, multi-cluster, history) are not implemented.

See the [Roadmap](roadmap.md) for what's coming. Feedback and contributions are welcome!

---

## Can I use it without Flux installed?

No. Without Flux CRDs on the cluster, the backend will list empty resources and display an empty graph. Xafrun is purpose-built for Flux CD v2.

---

## Does it work with HelmRepositories and OCIRepositories?

The current graph includes `GitRepository` sources only. `HelmRepository` and `OCIRepository` nodes are on the roadmap (Track A).

---

## How do I report a bug?

Open an issue on [GitHub](https://github.com/omilun/Xafrun/issues) with steps to reproduce, the Xafrun version, and the output of `kubectl get gitrepositories,kustomizations,helmreleases -A`.
