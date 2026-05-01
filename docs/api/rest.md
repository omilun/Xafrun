# REST Endpoints

The Xafrun backend exposes three HTTP endpoints, all under `/api/`.

---

## `GET /api/tree`

Returns the current graph snapshot as JSON. This is a one-shot request; for live updates use [`GET /api/events`](../api/sse.md).

### Response

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
      "name": "infrastructure",
      "namespace": "flux-system",
      "kind": "Kustomization",
      "status": "Healthy",
      "message": "",
      "sourceRef": "GitRepository/main-repo",
      "revision": "master@sha1:abc123",
      "inventory": [
        "flux-system_cert-manager__HelmRelease.v2",
        "flux-system_cilium__HelmRelease.v2"
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

### Node fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Kubernetes UID of the resource |
| `type` | `"Source"` \| `"Kustomization"` \| `"HelmRelease"` | Node category |
| `name` | string | Resource name |
| `namespace` | string | Resource namespace |
| `kind` | string | Kubernetes Kind (`GitRepository`, `Kustomization`, `HelmRelease`) |
| `status` | `"Healthy"` \| `"Progressing"` \| `"Unhealthy"` \| `"Unknown"` | Derived from `Ready` condition |
| `message` | string | Error/progress message from `Ready` condition (omitted when empty) |
| `sourceRef` | string | Parent source reference, e.g. `"GitRepository/main-repo"` (omitted when empty) |
| `revision` | string | Last applied revision / commit SHA (omitted when empty) |
| `inventory` | string[] | Managed object IDs from Kustomization inventory (omitted when empty) |

### Edge fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | `"e-{sourceUID}-{targetUID}"` |
| `source` | string | UID of the parent node |
| `target` | string | UID of the child node |

---

## `GET /api/info`

Returns cluster metadata for the status ticker.

### Response

```json
{
  "clusterName": "talos-tart-ha",
  "k8sVersion": "v1.30.2",
  "fluxVersion": "v2.3.0",
  "talosVersion": "Talos (v1.7.4)",
  "ciliumVersion": "v1.15.6",
  "ingressController": "Cilium Gateway API"
}
```

### Fields

| Field | Source |
|-------|--------|
| `clusterName` | `CLUSTER_NAME` env var, default `"talos-tart-ha"` |
| `k8sVersion` | Kubernetes discovery API (`/version`) |
| `fluxVersion` | `source-controller` deployment image tag in `flux-system` |
| `talosVersion` | First node's `status.nodeInfo.osImage` |
| `ciliumVersion` | `cilium` DaemonSet image tag in `kube-system` |
| `ingressController` | Hardcoded `"Cilium Gateway API"` (will be configurable) |

!!! note
    Fields that cannot be resolved (e.g., if Cilium is not installed) are returned as empty strings rather than causing an error.
