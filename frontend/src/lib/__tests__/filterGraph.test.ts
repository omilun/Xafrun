import { describe, it, expect } from 'vitest';
import { filterGraph, extractAppSubtree, parseInventoryId } from '../filterGraph';
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

describe('filterGraph (legacy)', () => {
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

describe('extractAppSubtree', () => {
  it('includes the app node, its upstream source, and its downstream child', () => {
    const result = extractAppSubtree(graph, 'kust-1');
    const ids = result.nodes.map((n) => n.id);
    expect(ids).toContain('kust-1'); // the app itself
    expect(ids).toContain('src-1');  // upstream source (edge: src-1 → kust-1)
    expect(ids).toContain('hr-1');   // downstream (edge: kust-1 → hr-1)
    expect(result.nodes).toHaveLength(3);
  });

  it('for a leaf node only returns itself + upstream', () => {
    const result = extractAppSubtree(graph, 'hr-1');
    const ids = result.nodes.map((n) => n.id);
    expect(ids).toContain('hr-1');
    expect(ids).toContain('kust-1');
    expect(ids).not.toContain('src-1');
    expect(result.nodes).toHaveLength(2);
  });
});

describe('parseInventoryId', () => {
  it('parses a Certificate entry', () => {
    const result = parseInventoryId('cert-manager_root-ca_cert-manager.io_Certificate');
    expect(result.namespace).toBe('cert-manager');
    expect(result.name).toBe('root-ca');
    expect(result.group).toBe('cert-manager.io');
    expect(result.kind).toBe('Certificate');
  });

  it('parses a Namespace entry (empty namespace)', () => {
    const result = parseInventoryId('_pulse__Namespace');
    expect(result.name).toBe('pulse');
    expect(result.kind).toBe('Namespace');
  });

  it('parses a Kustomization entry', () => {
    const result = parseInventoryId('flux-system_apps_kustomize.toolkit.fluxcd.io_Kustomization');
    expect(result.namespace).toBe('flux-system');
    expect(result.name).toBe('apps');
    expect(result.kind).toBe('Kustomization');
  });
});
