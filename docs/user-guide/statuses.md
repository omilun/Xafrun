# Resource Statuses

Xafrun derives health status from the standard Flux `Ready` condition on each resource. The mapping is intentionally simple and mirrors what `flux get all` shows.

## Status mapping

| Flux `Ready` condition | Reason | Xafrun status | Colour |
|------------------------|--------|-----------------|--------|
| `status: "True"` | any | **Healthy** | 🟢 Green |
| `status: "False"` | `Progressing` or `Reconciling` | **Progressing** | 🟡 Yellow |
| `status: "False"` | any other reason | **Unhealthy** | 🔴 Red |
| condition absent | — | **Unknown** | ⚫ Grey |

## Status descriptions

**Healthy**
: The resource has reconciled successfully. The last applied revision is up to date with the Git source.

**Progressing**
: Flux is actively working on this resource — pulling a new revision, applying manifests, or waiting for a Helm install/upgrade to complete.

**Unhealthy**
: Reconciliation failed. The status message (shown in the node tooltip and status ticker) contains the error from Flux, e.g. a failed `kustomize build`, a Helm upgrade error, or a source fetch failure.

**Unknown**
: The resource has been seen by the Kubernetes API but has not yet reported a `Ready` condition. This is normal for a few seconds after creation.

## Status message

When a resource is **Unhealthy** or **Progressing**, Xafrun extracts the `message` field from the `Ready` condition and attaches it to the node. This message appears in:

- The node tooltip (hover)
- The status ticker (scrolling error list)
- The `message` field in the [`GET /api/tree`](../api/rest.md#get-apitree) JSON response

!!! note
    Xafrun does not currently surface sub-conditions (e.g., `Stalled`, `Reconciling` from Flux v2.3+). These are surfaced via the `message` field of the `Ready` condition.
