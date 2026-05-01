import { FluxGraph, FluxNode, FluxEdge, InventoryItem } from '@/types';

/** @deprecated namespace filter replaced by extractAppSubtree */
export function filterGraph(graph: FluxGraph, namespace: string | null): FluxGraph {
  if (!namespace) return graph;

  const targetIds = new Set(
    graph.nodes.filter((n) => n.namespace === namespace).map((n) => n.id)
  );

  let changed = true;
  while (changed) {
    changed = false;
    graph.edges.forEach((e) => {
      if (targetIds.has(e.target) && !targetIds.has(e.source)) {
        targetIds.add(e.source);
        changed = true;
      }
    });
  }

  const nodes: FluxNode[] = graph.nodes.filter((n) => targetIds.has(n.id));
  const edges: FluxEdge[] = graph.edges.filter(
    (e) => targetIds.has(e.source) && targetIds.has(e.target)
  );
  return { nodes, edges };
}

/**
 * Extract the subgraph centred on one app node: the app itself, its upstream
 * sources (reachable via incoming edges), and direct children.
 */
export function extractAppSubtree(graph: FluxGraph, appNodeId: string): FluxGraph {
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const included = new Set<string>([appNodeId]);

  // Walk upstream (sources) — edges point source→app, so "source" is an upstream provider.
  graph.edges.forEach((e) => {
    if (e.target === appNodeId) included.add(e.source);
  });
  // Walk downstream (children/dependents).
  graph.edges.forEach((e) => {
    if (e.source === appNodeId) included.add(e.target);
  });

  const nodes = [...included].flatMap((id) => {
    const n = nodeMap.get(id);
    return n ? [n] : [];
  });
  const edges = graph.edges.filter(
    (e) => included.has(e.source) && included.has(e.target)
  );
  return { nodes, edges };
}

/**
 * Parse a Flux inventory entry ID into its components.
 * Format: `{namespace}_{name}_{group}_{kind}`
 * Example: `cert-manager_root-ca_cert-manager.io_Certificate`
 */
export function parseInventoryId(id: string): InventoryItem {
  const parts = id.split('_');
  if (parts.length < 4) {
    return { namespace: '', name: id, group: '', kind: 'Unknown' };
  }
  // Last part = kind, second-to-last = group, second = name, first = namespace
  const kind = parts[parts.length - 1];
  const group = parts[parts.length - 2];
  const name = parts[parts.length - 3];
  const namespace = parts.slice(0, parts.length - 3).join('_');
  return { namespace, name, group, kind };
}
