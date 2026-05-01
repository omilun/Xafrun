import { describe, it, expect } from 'vitest';
import { filterGraph } from '../filterGraph';
import { FluxGraph } from '@/types';

const graph: FluxGraph = {
  nodes: [
    { id: 'src-1', type: 'Source', name: 'flux-source', namespace: 'flux-system', kind: 'GitRepository', status: 'Healthy' },
    { id: 'kust-1', type: 'Kustomization', name: 'apps', namespace: 'apps', kind: 'Kustomization', status: 'Healthy' },
    { id: 'hr-1', type: 'HelmRelease', name: 'my-release', namespace: 'apps', kind: 'HelmRelease', status: 'Healthy' },
  ],
  edges: [
    { id: 'e1', source: 'src-1', target: 'kust-1' },
    { id: 'e2', source: 'kust-1', target: 'hr-1' },
  ],
};

describe('filterGraph', () => {
  it('returns full graph when namespace is null', () => {
    const result = filterGraph(graph, null);
    expect(result.nodes).toHaveLength(3);
    expect(result.edges).toHaveLength(2);
  });

  it('filters by apps namespace and includes ancestor (flux-system source)', () => {
    const result = filterGraph(graph, 'apps');
    expect(result.nodes).toHaveLength(3);
    const ids = result.nodes.map((n) => n.id);
    expect(ids).toContain('src-1');
    expect(ids).toContain('kust-1');
    expect(ids).toContain('hr-1');
  });

  it('filters by flux-system namespace and only keeps the source', () => {
    const result = filterGraph(graph, 'flux-system');
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe('src-1');
    expect(result.edges).toHaveLength(0);
  });
});
