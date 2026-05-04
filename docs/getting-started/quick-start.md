# Quick Start

Get Xafrun running against any Kubernetes cluster with Flux installed.

## Prerequisites

- A Kubernetes cluster (1.29+) with [Flux CD v2](https://fluxcd.io/flux/installation/) installed
- `kubectl` configured and pointing at your cluster
- [Helm](https://helm.sh) ≥ 3.12 **or** `kustomize` ≥ 5

---

## 1. Install Xafrun

=== "Helm"

    ```bash
    helm install xafrun oci://ghcr.io/omilun/charts/xafrun \
      --namespace xafrun --create-namespace
    ```

=== "Kustomize"

    ```bash
    kubectl apply -k github.com/omilun/Xafrun//deploy?ref=v0.1.8
    ```

=== "From source"

    ```bash
    git clone https://github.com/omilun/Xafrun.git
    cd Xafrun
    make run   # backend :8080 · frontend :3000
    ```

## 2. Open the dashboard

```bash
kubectl port-forward -n xafrun svc/xafrun-frontend 3000:80
open http://localhost:3000
```

!!! tip
    The graph may appear empty if you have no Flux sources yet. Add a `GitRepository` and
    `Kustomization` to see the graph populate in real time.

## 3. Create a sample source (optional)

```bash
flux create source git podinfo \
  --url=https://github.com/stefanprodan/podinfo \
  --branch=master \
  --interval=1m

flux create kustomization podinfo \
  --source=podinfo \
  --path="./kustomize" \
  --prune=true \
  --interval=5m
```

Switch back to the browser — the graph updates via SSE, no page refresh needed.

---

## Next steps

- [Full Helm installation reference](install-helm.md)
- [Kustomize installation](install-kustomize.md)
- [Running locally for development](local-dev.md)
