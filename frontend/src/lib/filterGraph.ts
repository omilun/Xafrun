import { FluxGraph, FluxNode, FluxEdge } from '@/types';

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
