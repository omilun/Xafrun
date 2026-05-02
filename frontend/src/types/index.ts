export type NodeType =
  | 'Source'
  | 'Kustomization'
  | 'HelmRelease'
  | 'K8sResource'
  | 'OCIRepository'
  | 'Bucket'
  | 'HelmRepository'
  | 'HelmChart'
  | 'ImageRepository'
  | 'ImagePolicy'
  | 'ImageUpdateAutomation'
  | 'Receiver'
  | 'Alert'
  | 'Provider';

export type HealthStatus = 'Healthy' | 'Unhealthy' | 'Progressing' | 'Unknown';
export type SyncStatus = 'Synced' | 'OutOfSync' | 'Unknown';

export interface FluxNode {
  id: string;
  type: NodeType;
  name: string;
  namespace: string;
  kind: string;
  status: HealthStatus;
  syncStatus?: SyncStatus;
  suspended?: boolean;
  message?: string;
  sourceRef?: string;
  revision?: string;
  inventory?: string[];
  chartName?: string;
}

export interface FluxEdge {
  id: string;
  source: string;
  target: string;
}

export interface FluxGraph {
  nodes: FluxNode[];
  edges: FluxEdge[];
}

export interface ClusterInfo {
  clusterName: string;
  k8sVersion: string;
  fluxVersion: string;
  osImage: string;
  cniVersion: string;
  ingressController: string;
}

export interface K8sEvent {
  type: string;       // Normal | Warning
  reason: string;
  message: string;
  count: number;
  lastTimestamp: string;
}

// A parsed Flux inventory entry: namespace_name_group_kind
export interface InventoryItem {
  namespace: string;
  name: string;
  group: string;
  kind: string;
}

// Top-level Flux app kinds shown in the app list
export const APP_KINDS = new Set(['Kustomization', 'HelmRelease']);

// Source kinds (shown as source nodes in detail graph)
export const SOURCE_KINDS = new Set([
  'GitRepository', 'OCIRepository', 'Bucket',
  'HelmRepository', 'HelmChart',
]);

/**
 * Returns true if this Kustomization is an orchestrator (parent) that deploys
 * other Flux objects rather than actual workloads. These should be hidden from
 * the app list — only leaf Kustomizations and all HelmReleases are shown.
 */
export function isOrchestratorKustomization(node: FluxNode): boolean {
  if (node.kind !== 'Kustomization') return false;
  // If it has no inventory we can't tell — show it to be safe.
  if (!node.inventory || node.inventory.length === 0) return false;
  return node.inventory.some(
    (id) => id.endsWith('_Kustomization') || id.endsWith('_HelmRelease'),
  );
}
