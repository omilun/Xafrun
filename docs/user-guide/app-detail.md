# App Detail & Resource Graph

The App Detail view opens when you click a card in the [App List](dashboard.md). It shows a React Flow graph for one application.

## Graph layout

The graph uses a **top-down dagre layout** with three tiers:

```
Tier 1:  [ Source ]           (GitRepository / HelmRepository)
                │
Tier 2:  [ App ]              (Kustomization / HelmRelease)
         │    │    │
Tier 3:  [Dep] [Svc] [Secret] (inventory K8s resources)
```

Nodes are connected by directed edges (arrows). `fitView` is called after every layout pass.

## Inventory nodes

Kustomizations expose an `inventory[]` list of managed resource IDs in the format:

```
{namespace}_{name}_{group}_{kind}
```

Examples:

| ID | Parsed |
|----|--------|
| `cert-manager_cert-manager_apps_Deployment` | ns=`cert-manager`, name=`cert-manager`, kind=`Deployment` |
| `cert-manager_root-ca_cert-manager.io_Certificate` | ns=`cert-manager`, name=`root-ca`, kind=`Certificate` |
| `_pulse__Namespace` | ns=`""`, name=`pulse`, kind=`Namespace` |

Inventory nodes are grouped by kind when laid out.

!!! note
    Inventory node health status is shown as **Unknown** by default — Xafrun does not make additional API calls to check the live status of each inventory item (this would multiply the API load). The status shown for the App node itself (Kustomization / HelmRelease) is always accurate.

## Node colours

Each K8s inventory node has a **coloured left-stripe accent** indicating its category:

| Category | Colour | Kinds |
|----------|--------|-------|
| Workloads | 🔵 Blue/Indigo | Deployment, StatefulSet, DaemonSet, ReplicaSet, Job, CronJob, Pod |
| Services | 🩵 Teal | Service |
| Networking | 🟢 Lime/Emerald | Ingress, IngressRoute, HTTPRoute, Gateway |
| Config | 🟡 Amber/Orange | ConfigMap, Secret, PersistentVolumeClaim |
| RBAC | 🩷 Pink/Rose | ClusterRole, ClusterRoleBinding, Role, RoleBinding, ServiceAccount |
| Cert-manager | 🩵 Cyan | Certificate, Issuer, ClusterIssuer |

Flux source and app nodes also have kind-based accent stripes (GitRepository=teal, Kustomization=indigo, HelmRelease=amber, etc.).

## Navigating back

Use the **Back** button in the top-left or the breadcrumb (`Apps › [app-name]`) to return to the App List.

## Controls

- **Minimap** — bottom-right overview for large graphs.
- **Zoom controls** — `+` / `-` buttons, or scroll wheel.
- **Pan** — click and drag the canvas background.
