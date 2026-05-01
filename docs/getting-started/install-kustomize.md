# Kustomize Installation

Install Fluxbaan using `kubectl apply -k` (no Helm required).

## Apply the base manifests

```bash
kubectl apply -k github.com/omilun/Fluxbaan//deploy?ref=v0.1.0
```

This creates:

- `Namespace` **fluxbaan**
- `ServiceAccount`, `ClusterRole`, and `ClusterRoleBinding`
- `Deployment` for the combined backend + frontend pod
- `Service` exposing ports 8080 (backend) and 3000 (frontend)

## Verify the deployment

```bash
kubectl rollout status deployment/fluxbaan -n fluxbaan
kubectl get pods -n fluxbaan
```

## Adding your own overlays

Create a local `kustomization.yaml` that references the remote base:

```yaml title="my-overlay/kustomization.yaml"
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - github.com/omilun/Fluxbaan//deploy?ref=v0.1.0

namespace: fluxbaan

patches:
  - patch: |-
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: fluxbaan
      spec:
        template:
          spec:
            containers:
              - name: backend
                env:
                  - name: CLUSTER_NAME
                    value: "my-production-cluster"
    target:
      kind: Deployment
      name: fluxbaan
```

Apply your overlay:

```bash
kubectl apply -k my-overlay/
```

## Updating

To update to a newer release, change the `ref` in your `kustomization.yaml`:

```yaml
resources:
  - github.com/omilun/Fluxbaan//deploy?ref=v0.2.0
```

Then re-apply:

```bash
kubectl apply -k my-overlay/
```

!!! tip
    Pin to a specific Git tag (`?ref=v0.1.0`) rather than a branch for reproducible deployments in GitOps pipelines.

## Uninstalling

```bash
kubectl delete -k github.com/omilun/Fluxbaan//deploy?ref=v0.1.0
```
