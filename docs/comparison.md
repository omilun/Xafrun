# Comparison

How does Xafrun compare to other tools in the Flux CD ecosystem?

!!! note "Honest assessment"
    This table reflects the current state of Xafrun (alpha). Items marked TODO are on the [roadmap](roadmap.md).

## Feature comparison

| Feature | **Xafrun** | Weave GitOps OSS | Capacitor | Headlamp | `flux` CLI |
|---------|:---:|:---:|:---:|:---:|:---:|
| **Real-time updates** | ✅ SSE | ✅ | ✅ polling | ❌ | ❌ |
| **Dependency graph** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Log streaming** | 🔜 TODO | ✅ | ✅ | ✅ | ✅ |
| **Multi-cluster** | 🔜 TODO | ✅ (enterprise) | ❌ | ✅ | ❌ |
| **Authentication** | 🔜 TODO | ✅ OIDC | ❌ | ✅ | n/a |
| **Flux-native** | ✅ | ✅ | ✅ | ❌ (plugin) | ✅ |
| **Lightweight** | ✅ | ⚠️ heavy | ✅ | ⚠️ Electron | ✅ CLI |

## Notes

**Weave GitOps OSS** ([github.com/weaveworks/weave-gitops](https://github.com/weaveworks/weave-gitops))
: Full-featured Flux UI with OIDC, multi-cluster (enterprise), and log streaming. No dependency graph. Heavier footprint.

**Capacitor** ([github.com/gimlet-io/capacitor](https://github.com/gimlet-io/capacitor))
: Lightweight read-only Flux dashboard. Shows resource lists and logs. No dependency graph and no real-time push (polls).

**Headlamp** ([headlamp.dev](https://headlamp.dev))
: General-purpose Kubernetes dashboard with a Flux plugin. Not Flux-native; shows generic Kubernetes objects. Electron desktop app.

**`flux` CLI**
: The official Flux command-line tool. Excellent for power users; no visual graph; no persistent UI.

**Xafrun's unique value**
: The only tool in this list that provides a **real-time interactive dependency graph** (GitRepository → Kustomization → HelmRelease) with live health colours, served as a lightweight web app.
