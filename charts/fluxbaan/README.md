# fluxbaan Helm Chart

A Helm chart for **Fluxbaan** — a real-time visual GitOps dashboard for Flux CD.

## Prerequisites

- Kubernetes 1.25+
- Helm 3.10+
- Flux CD installed in the cluster (the backend reads Flux CRDs)
- _(Optional)_ Gateway API CRDs for HTTPRoute support

## Installation

### From OCI registry (recommended)

```bash
helm install fluxbaan oci://ghcr.io/omilun/charts/fluxbaan \
  --namespace fluxbaan \
  --create-namespace
```

### From a local clone

```bash
helm install fluxbaan ./charts/fluxbaan \
  --namespace fluxbaan \
  --create-namespace
```

### Upgrade

```bash
helm upgrade fluxbaan ./charts/fluxbaan --namespace fluxbaan
```

### Uninstall

```bash
helm uninstall fluxbaan --namespace fluxbaan
```

> **Note:** The ClusterRole and ClusterRoleBinding are cluster-scoped. They are removed automatically on `helm uninstall`.

## Exposing the UI

| Method | Command |
|--------|---------|
| Port-forward (default) | `kubectl port-forward -n fluxbaan svc/fluxbaan-frontend 80:80` |
| Ingress | `--set ingress.enabled=true --set ingress.host=fluxbaan.example.com` |
| Gateway API HTTPRoute | `--set httpRoute.enabled=true --set 'httpRoute.parentRefs[0].name=main-gateway'` |

## Values

| Key | Default | Description |
|-----|---------|-------------|
| `backend.image.repository` | `ghcr.io/omilun/fluxbaan-backend` | Backend image repository |
| `backend.image.tag` | `""` | Image tag; defaults to `.Chart.AppVersion` |
| `backend.image.pullPolicy` | `IfNotPresent` | Image pull policy |
| `backend.replicas` | `1` | Backend replica count |
| `backend.resources` | see values | CPU/memory requests and limits |
| `backend.service.port` | `8080` | Backend service port |
| `backend.clusterName` | `""` | Cluster name shown in the UI ticker |
| `frontend.image.repository` | `ghcr.io/omilun/fluxbaan-frontend` | Frontend image repository |
| `frontend.image.tag` | `""` | Image tag; defaults to `.Chart.AppVersion` |
| `frontend.image.pullPolicy` | `IfNotPresent` | Image pull policy |
| `frontend.replicas` | `1` | Frontend replica count |
| `frontend.resources` | see values | CPU/memory requests and limits |
| `frontend.service.type` | `ClusterIP` | Frontend Service type |
| `frontend.service.port` | `80` | Frontend Service port |
| `serviceAccount.create` | `true` | Create a ServiceAccount for the backend |
| `serviceAccount.name` | `""` | Override ServiceAccount name |
| `rbac.create` | `true` | Create ClusterRole + ClusterRoleBinding |
| `podSecurityContext` | see values | Pod-level security context |
| `containerSecurityContext` | see values | Container-level security context |
| `ingress.enabled` | `false` | Enable Ingress resource |
| `ingress.className` | `""` | IngressClass name |
| `ingress.annotations` | `{}` | Ingress annotations |
| `ingress.host` | `fluxbaan.local` | Ingress hostname |
| `ingress.tls` | `[]` | TLS configuration |
| `httpRoute.enabled` | `false` | Enable Gateway API HTTPRoute |
| `httpRoute.parentRefs` | `[]` | Gateway parentRefs |
| `httpRoute.hostnames` | `[]` | HTTPRoute hostnames |
| `networkPolicy.enabled` | `false` | Enable NetworkPolicy for the frontend |
| `networkPolicy.ingressNamespaceSelector` | `{matchLabels: {kubernetes.io/metadata.name: networking}}` | Namespace selector for allowed ingress |
| `nodeSelector` | `{}` | Node selector for all pods |
| `tolerations` | `[]` | Tolerations for all pods |
| `affinity` | `{}` | Affinity rules for all pods |
| `podAnnotations` | `{}` | Annotations added to all pods |
| `podLabels` | `{}` | Extra labels added to all pods |
| `backendExtraEnv` | `[]` | Extra env vars appended to the backend container |
