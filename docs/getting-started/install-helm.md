# Helm Installation

This page covers the full reference for installing Fluxbaan with Helm.

## Install

Fluxbaan publishes its Helm chart as an **OCI artefact** to the in-cluster
Zot registry — no `helm repo add` step required.

```bash
helm install fluxbaan oci://registry.talos-tart-ha.talos-on-macos.com/charts/fluxbaan \
  --version 0.1.0 \
  --namespace fluxbaan --create-namespace \
  --set backend.clusterName=my-cluster
```

> **Tip:** clone the repo and install from a local path during development:
>
> ```bash
> helm install fluxbaan ./charts/fluxbaan \
>   --namespace fluxbaan --create-namespace
> ```

## Common values

| Key | Default | Description |
|-----|---------|-------------|
| `replicaCount` | `1` | Number of Fluxbaan pods |
| `image.repository` | `ghcr.io/omilun/fluxbaan` | Container image |
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
    helm show values fluxbaan/fluxbaan
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
    - host: fluxbaan.example.com
      paths:
        - path: /
          pathType: Prefix
```

```bash
helm install fluxbaan fluxbaan/fluxbaan \
  --namespace fluxbaan --create-namespace \
  -f values-override.yaml
```

## Upgrading

```bash
helm repo update
helm upgrade fluxbaan fluxbaan/fluxbaan --namespace fluxbaan
```

## Uninstalling

```bash
helm uninstall fluxbaan --namespace fluxbaan
kubectl delete namespace fluxbaan
```

!!! warning
    Uninstalling removes the Fluxbaan pod and service but does **not** affect the Flux resources being visualised.
