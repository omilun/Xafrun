# RBAC & Permissions

Xafrun requires read-only access to Flux CRDs and a small set of core Kubernetes resources. It never writes to the cluster.

## ClusterRole

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: xafrun
rules:
  # Flux source-controller CRDs
  - apiGroups: ["source.toolkit.fluxcd.io"]
    resources: ["gitrepositories", "helmrepositories", "helmcharts", "ocirepositories"]
    verbs: ["get", "list", "watch"]

  # Flux kustomize-controller CRDs
  - apiGroups: ["kustomize.toolkit.fluxcd.io"]
    resources: ["kustomizations"]
    verbs: ["get", "list", "watch"]

  # Flux helm-controller CRDs
  - apiGroups: ["helm.toolkit.fluxcd.io"]
    resources: ["helmreleases"]
    verbs: ["get", "list", "watch"]

  # Core resources for /api/info
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["get", "list", "watch"]

  # Deployments and DaemonSets for version extraction
  - apiGroups: ["apps"]
    resources: ["deployments", "daemonsets"]
    verbs: ["get", "list", "watch"]
```

## ClusterRoleBinding

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: xafrun
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: xafrun
subjects:
  - kind: ServiceAccount
    name: xafrun
    namespace: xafrun
```

## Permission explanations

| Resource | Why needed |
|----------|-----------|
| `gitrepositories`, `kustomizations`, `helmreleases` | Core graph nodes — the Watcher lists and watches these. |
| `helmrepositories`, `helmcharts`, `ocirepositories` | Additional source types; included for future graph expansion. |
| `nodes` | Required by `GET /api/info` to read `status.nodeInfo.osImage` for the Talos OS version shown in the status ticker. |
| `deployments` | Used to find the `source-controller` image tag to report the Flux version. |
| `daemonsets` | Used to find the `cilium` image tag to report the Cilium version. |

!!! warning "ClusterRole scope"
    Xafrun uses a **ClusterRole** (not a namespaced Role) so it can see Flux resources in all namespaces. If you want to restrict it to specific namespaces, replace the ClusterRoleBinding with per-namespace RoleBindings, but note that `nodes` is a cluster-scoped resource and always requires a ClusterRole.

!!! note "Read-only"
    Xafrun never mutates cluster state. All verbs are `get`, `list`, and `watch` only.
