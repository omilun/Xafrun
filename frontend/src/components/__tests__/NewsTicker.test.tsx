import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NewsTicker } from '../NewsTicker';
import { FluxNode, ClusterInfo } from '@/types';

const healthyNodes: FluxNode[] = [
  { id: '1', type: 'Source', name: 'source', namespace: 'flux-system', kind: 'GitRepository', status: 'Healthy' },
];

const unhealthyNodes: FluxNode[] = [
  { id: '1', type: 'Kustomization', name: 'my-app', namespace: 'apps', kind: 'Kustomization', status: 'Unhealthy', message: 'reconciliation failed: exit status 1' },
];

const info: ClusterInfo = {
  clusterName: 'test-cluster',
  k8sVersion: 'v1.30.0',
  fluxVersion: 'v2.3.0',
  osImage: 'Talos v1.7.0',
  cniVersion: 'Cilium 1.15.0',
  ingressController: 'nginx',
};

describe('NewsTicker', () => {
  it('renders green bar for healthy nodes with info', () => {
    const { container } = render(<NewsTicker nodes={healthyNodes} info={info} />);
    const ticker = container.firstChild as HTMLElement;
    expect(ticker?.className).toContain('bg-green');
  });

  it('shows flux and k8s versions in ticker text for healthy state', () => {
    const { container } = render(<NewsTicker nodes={healthyNodes} info={info} />);
    // Starts collapsed for healthy cluster; click the strip to expand.
    fireEvent.click(container.firstChild as HTMLElement);
    expect(screen.getByText(/v2\.3\.0/)).toBeInTheDocument();
    expect(screen.getByText(/v1\.30\.0/)).toBeInTheDocument();
  });

  it('renders red bar for unhealthy nodes', () => {
    const { container } = render(<NewsTicker nodes={unhealthyNodes} info={null} />);
    const ticker = container.firstChild as HTMLElement;
    expect(ticker?.className).toContain('bg-red');
  });

  it('shows error message for unhealthy node', () => {
    render(<NewsTicker nodes={unhealthyNodes} info={null} />);
    expect(screen.getByText(/reconciliation failed/)).toBeInTheDocument();
  });

  it('collapses to a thin strip when collapse button is clicked', () => {
    const { container } = render(<NewsTicker nodes={healthyNodes} info={info} />);
    // Starts collapsed; expand first by clicking the thin strip.
    fireEvent.click(container.firstChild as HTMLElement);
    const collapseBtn = container.querySelector('button[title="Collapse status bar"]');
    expect(collapseBtn).toBeTruthy();
    fireEvent.click(collapseBtn!);
    const collapsed = container.firstChild as HTMLElement;
    expect(collapsed?.className).toContain('h-1.5');
  });
});
