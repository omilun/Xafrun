# REST Endpoints

The Xafrun backend exposes HTTP endpoints under `/api/`. All endpoints require a valid session token (when auth is enabled). Health and metrics endpoints are always public.

---

## Read endpoints

### `GET /api/tree`

Returns the current graph snapshot as JSON. For live updates use [`GET /api/events`](sse.md).

**Response**

```json
{
  "nodes": [
    {
      "id": "a1b2c3d4-...",
      "type": "Source",
      "name": "main-repo",
      "namespace": "flux-system",
      "kind": "GitRepository",
      "status": "Healthy",
      "message": "",
      "sourceRef": "branch/master",
      "revision": "master@sha1:abc123",
      "inventory": []
    },
    {
      "id": "e5f6a7b8-...",
      "type": "Kustomization",
      "name": "cert-manager",
      "namespace": "flux-system",
      "kind": "Kustomization",
      "status": "Healthy",
      "message": "",
      "sourceRef": "GitRepository/main-repo",
      "revision": "master@sha1:abc123",
      "inventory": [
        "cert-manager_cert-manager_apps_Deployment",
        "cert-manager_cert-manager__Namespace"
      ]
    }
  ],
  "edges": [
    {
      "id": "e-a1b2c3d4-e5f6a7b8",
      "source": "a1b2c3d4-...",
      "target": "e5f6a7b8-..."
    }
  ]
}
```

**Node fields**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Kubernetes UID |
| `type` | `"Source"` \| `"Kustomization"` \| `"HelmRelease"` | Node category |
| `name` | string | Resource name |
| `namespace` | string | Resource namespace |
| `kind` | string | Kubernetes Kind |
| `status` | `"Healthy"` \| `"Progressing"` \| `"Unhealthy"` \| `"Unknown"` | Derived from `Ready` condition |
| `message` | string | Error/progress message (empty when healthy) |
| `sourceRef` | string | Parent source reference, e.g. `"GitRepository/main-repo"` |
| `revision` | string | Last applied revision / commit SHA |
| `inventory` | string[] | Managed object IDs from Kustomization inventory (`{namespace}_{name}_{group}_{kind}`) |

---

### `GET /api/info`

Returns cluster metadata for the status ticker.

**Response**

```json
{
  "clusterName": "kubernetes",
  "k8sVersion": "v1.30.2",
  "fluxVersion": "v2.3.0",
  "osImage": "Talos (v1.7.4)",
  "cniVersion": "Cilium v1.15.6",
  "ingressController": "Cilium Gateway API"
}
```

**Fields**

| Field | Source |
|-------|--------|
| `clusterName` | `CLUSTER_NAME` env var, default `"kubernetes"` |
| `k8sVersion` | Kubernetes discovery API (`/version`) |
| `fluxVersion` | `source-controller` deployment image tag in `flux-system` |
| `osImage` | First ready node's `status.nodeInfo.osImage` (any distro) |
| `cniVersion` | Auto-detected from DaemonSets/Deployments (Cilium, Calico, Flannel, Weave…) |
| `ingressController` | Auto-detected from cluster workloads (Cilium Gateway, nginx, Traefik, Istio, Contour, Kong) |

!!! note
    Fields that cannot be resolved return an empty string rather than causing an error.

---

### `GET /api/yaml/:kind/:namespace/:name`

Returns the YAML representation of a Flux or Kubernetes resource. `managedFields` is stripped from the output.

**Path parameters**

| Param | Description | Examples |
|-------|-------------|---------|
| `kind` | Resource kind (case-insensitive) | `Kustomization`, `HelmRelease`, `GitRepository`, `Deployment`, `ConfigMap`, `Secret` |
| `namespace` | Resource namespace | `flux-system`, `cert-manager` |
| `name` | Resource name | `cert-manager` |

**Response**

```json
{ "yaml": "apiVersion: kustomize.toolkit.fluxcd.io/v1\nkind: Kustomization\n..." }
```

**Status codes**

| Code | Meaning |
|------|---------|
| `200` | YAML returned |
| `400` | Unsupported kind (for Flux-only types via the typed client) |
| `404` | Resource not found |
| `500` | Internal error |

---

### `GET /api/k8sevents/:kind/:namespace/:name`

Returns Kubernetes events for a resource, filtered by `involvedObject.name`.

**Response**

```json
[
  {
    "type": "Normal",
    "reason": "Synced",
    "message": "Fetched revision: master@sha1:abc123",
    "count": 42,
    "lastTimestamp": "2026-05-02T10:30:00.000000Z"
  },
  {
    "type": "Warning",
    "reason": "ReconciliationFailed",
    "message": "context deadline exceeded",
    "count": 1,
    "lastTimestamp": "2026-05-01T08:00:00.000000Z"
  }
]
```

Returns an empty array `[]` if no events are found.

---

### `GET /api/logs/:namespace/:name`

Streams Pod log lines as **Server-Sent Events** (SSE). Each event carries one log line.

**Path parameters**

| Param | Description |
|-------|-------------|
| `namespace` | Pod namespace |
| `name` | Pod name |

**Wire format**

```
data: 2026-05-02T10:30:00Z INFO reconciling kustomization

data: 2026-05-02T10:30:01Z INFO revision updated

```

**Response headers**

```
Content-Type: text/event-stream
Cache-Control: no-cache
X-Accel-Buffering: no
```

---

### `GET /api/openapi.json`

Returns an OpenAPI 3.0 JSON spec for all REST endpoints.

---

## Write endpoints

All write endpoints return `204 No Content` on success and `4xx`/`5xx` JSON on failure.

### `POST /api/reconcile/:kind/:namespace/:name`

Triggers an immediate Flux reconciliation by patching the `reconcile.fluxcd.io/requestedAt` annotation.

**Supported kinds:** `GitRepository`, `OCIRepository`, `Bucket`, `HelmRepository`, `HelmChart`, `Kustomization`, `HelmRelease`, `ImageRepository`, `ImageUpdateAutomation`.

**Responses**

| Code | Meaning |
|------|---------|
| `204` | Annotation patched; Flux controller will reconcile within seconds |
| `400` | Unsupported kind |
| `404` | Resource not found |
| `500` | Patch failed |

---

### `POST /api/suspend/:kind/:namespace/:name`

Sets `spec.suspend: true` to pause Flux reconciliation for the resource.

**Supported kinds:** same as `/api/reconcile`.

---

### `POST /api/resume/:kind/:namespace/:name`

Sets `spec.suspend: false` to re-enable Flux reconciliation.

**Supported kinds:** same as `/api/reconcile`.

---

## Operational endpoints

These endpoints are always public (no auth required).

| Endpoint | Description |
|----------|-------------|
| `GET /healthz` | Liveness probe — returns `200 OK` when the process is running |
| `GET /readyz` | Readiness probe — returns `200 OK` when the Kubernetes cache has synced |
| `GET /metrics` | Prometheus metrics (standard Go runtime + custom Xafrun metrics) |
