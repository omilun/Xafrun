# Helm Installation

This page covers the full reference for installing Xafrun with Helm.

## Install

Xafrun publishes its Helm chart as an **OCI artefact** to the in-cluster
Zot registry — no `helm repo add` step required.

```bash
helm install xafrun oci://registry.talos-tart-ha.talos-on-macos.com/charts/xafrun \
  --version 0.1.0 \
  --namespace xafrun --create-namespace \
  --set backend.clusterName=my-cluster
```

> **Tip:** clone the repo and install from a local path during development:
>
> ```bash
> helm install xafrun ./charts/xafrun \
>   --namespace xafrun --create-namespace
> ```

## Common values

| Key | Default | Description |
|-----|---------|-------------|
| `replicaCount` | `1` | Number of Xafrun pods |
| `image.repository` | `ghcr.io/omilun/xafrun` | Container image |
| `image.tag` | `""` (chart appVersion) | Image tag override |
| `image.pullPolicy` | `IfNotPresent` | Pull policy |
| `clusterName` | `""` | Cluster name shown in the status ticker |
| `service.type` | `ClusterIP` | Kubernetes service type |
| `service.port` | `3000` | Frontend port |
| `service.backendPort` | `8080` | Backend port |
| `ingress.enabled` | `false` | Enable an Ingress resource |
| `ingress.className` | `""` | Ingress class name |
| `ingress.hosts` | `[]` | Ingress host rules |
| `resources` | `{}` | Pod resource requests/limits |
| `serviceAccount.create` | `true` | Create a dedicated ServiceAccount |
| `rbac.create` | `true` | Create ClusterRole and ClusterRoleBinding |

!!! note
    For the full list of configurable values, run:
    ```bash
    helm show values xafrun/xafrun
    ```

## Customising with a values file

```yaml title="values-override.yaml"
clusterName: production

resources:
  requests:
    cpu: 50m
    memory: 64Mi
  limits:
    cpu: 200m
    memory: 128Mi

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: xafrun.example.com
      paths:
        - path: /
          pathType: Prefix
```

```bash
helm install xafrun xafrun/xafrun \
  --namespace xafrun --create-namespace \
  -f values-override.yaml
```

## Upgrading

```bash
helm repo update
helm upgrade xafrun xafrun/xafrun --namespace xafrun
```

## Uninstalling

```bash
helm uninstall xafrun --namespace xafrun
kubectl delete namespace xafrun
```

!!! warning
    Uninstalling removes the Xafrun pod and service but does **not** affect the Flux resources being visualised.
