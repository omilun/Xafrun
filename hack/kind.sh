#!/usr/bin/env bash
# hack/kind.sh — spin up Xafrun against a fresh kind cluster in ~60s.
#
# Requires: kind, kubectl, helm, flux CLI.
# Usage:    ./hack/kind.sh
set -euo pipefail

CLUSTER_NAME="${CLUSTER_NAME:-xafrun-demo}"
NAMESPACE="${NAMESPACE:-xafrun}"
CHART_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/charts/xafrun"

bold()   { printf "\033[1m%s\033[0m\n" "$*"; }
green()  { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }

require() {
  command -v "$1" >/dev/null 2>&1 || {
    yellow "✗ $1 not found in PATH"
    exit 1
  }
}

require kind
require kubectl
require helm
require flux

bold "▸ Creating kind cluster '${CLUSTER_NAME}'…"
if kind get clusters | grep -qx "${CLUSTER_NAME}"; then
  yellow "  cluster already exists; reusing"
else
  kind create cluster --name "${CLUSTER_NAME}" --wait 60s
fi

bold "▸ Installing Flux v2 (flux install)…"
flux install --components=source-controller,kustomize-controller,helm-controller,notification-controller

bold "▸ Installing Xafrun from local chart…"
helm upgrade --install xafrun "${CHART_DIR}" \
  --namespace "${NAMESPACE}" --create-namespace \
  --set backend.clusterName="${CLUSTER_NAME}" \
  --wait --timeout 3m

bold "▸ Waiting for backend cache sync…"
kubectl -n "${NAMESPACE}" rollout status deploy/xafrun-backend  --timeout=120s
kubectl -n "${NAMESPACE}" rollout status deploy/xafrun-frontend --timeout=120s

green "✔ Xafrun is running."
echo
echo "  Run this in another terminal:"
echo "    kubectl -n ${NAMESPACE} port-forward svc/xafrun-frontend 3000:80"
echo
echo "  Then open: http://localhost:3000"
echo
echo "  To tear down:"
echo "    kind delete cluster --name ${CLUSTER_NAME}"
