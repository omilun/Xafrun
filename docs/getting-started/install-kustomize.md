# Kustomize Installation

Install Xafrun using `kubectl apply -k` (no Helm required).

## Apply the base manifests

```bash
kubectl apply -k github.com/omilun/Xafrun//deploy?ref=v0.1.6
```

This creates:

- `Namespace` **xafrun**
- `ServiceAccount`, `ClusterRole`, and `ClusterRoleBinding`
- `Deployment` for the combined backend + frontend pod
- `Service` exposing ports 8080 (backend) and 3000 (frontend)

## Verify the deployment

```bash
kubectl rollout status deployment/xafrun -n xafrun
kubectl get pods -n xafrun
```

## Adding your own overlays

Create a local `kustomization.yaml` that references the remote base:

```yaml title="my-overlay/kustomization.yaml"
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - github.com/omilun/Xafrun//deploy?ref=v0.1.6

namespace: xafrun

patches:
  - patch: |-
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: xafrun
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
      name: xafrun
```

Apply your overlay:

```bash
kubectl apply -k my-overlay/
```

## Updating

To update to a newer release, change the `ref` in your `kustomization.yaml`:

```yaml
resources:
  - github.com/omilun/Xafrun//deploy?ref=v0.1.6
```

Then re-apply:

```bash
kubectl apply -k my-overlay/
```

!!! tip
    Pin to a specific Git tag (`?ref=v0.1.6`) rather than a branch for reproducible deployments in GitOps pipelines.

## Uninstalling

```bash
kubectl delete -k github.com/omilun/Xafrun//deploy?ref=v0.1.6
```
