export type NodeType = 'Source' | 'Kustomization' | 'HelmRelease' | 'K8sResource';
export type HealthStatus = 'Healthy' | 'Unhealthy' | 'Progressing' | 'Unknown';

export interface FluxNode {
  id: string;
  type: NodeType;
  name: string;
  namespace: string;
  kind: string;
  status: HealthStatus;
  message?: string;
  sourceRef?: string;
  revision?: string;
  inventory?: string[];
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
  talosVersion: string;
  ciliumVersion: string;
  ingressController: string;
}
