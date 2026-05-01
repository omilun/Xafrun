# Quick Start

Get Fluxbaan running against a local `kind` cluster in about 60 seconds.

## Prerequisites

- [kind](https://kind.sigs.k8s.io/) and `kubectl` installed
- [Helm](https://helm.sh) ≥ 3.12 **or** `kustomize` ≥ 5

---

## 1. Create a local cluster

```bash
kind create cluster --name fluxbaan-demo
```

## 2. Install Flux CD

```bash
flux install
```

!!! note
    If you don't have the `flux` CLI, install it with `brew install fluxcd/tap/flux` or follow the [official guide](https://fluxcd.io/flux/installation/).

## 3. Install Fluxbaan

=== "Helm"

    ```bash
    helm install fluxbaan oci://ghcr.io/omilun/charts/fluxbaan \
      --namespace fluxbaan --create-namespace
    ```

=== "Kustomize"

    ```bash
    kubectl apply -k github.com/omilun/Fluxbaan//deploy?ref=v0.1.0
    ```

## 4. Port-forward and open

```bash
kubectl port-forward -n fluxbaan svc/fluxbaan 8080:8080 3000:3000 &
open http://localhost:3000
```

!!! tip
    The graph may appear empty if you haven't applied any Flux sources yet. Try adding a `GitRepository` and `Kustomization` to see the graph populate.

## 5. Create a sample source (optional)

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

Switch back to the browser — the graph updates in real time via SSE, no page refresh needed.

---

## Next steps

- [Full Helm installation reference](install-helm.md)
- [Kustomize installation](install-kustomize.md)
- [Running locally for development](local-dev.md)
