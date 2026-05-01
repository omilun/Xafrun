import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '../Sidebar';
import { FluxNode } from '@/types';

const nodes: FluxNode[] = [
  { id: '1', type: 'Source', name: 'flux-source', namespace: 'flux-system', kind: 'GitRepository', status: 'Healthy' },
  { id: '2', type: 'Kustomization', name: 'apps', namespace: 'apps', kind: 'Kustomization', status: 'Unhealthy' },
  { id: '3', type: 'HelmRelease', name: 'my-release', namespace: 'apps', kind: 'HelmRelease', status: 'Healthy' },
];

describe('Sidebar', () => {
  it('renders namespace list', () => {
    render(<Sidebar nodes={nodes} selected={null} onSelect={vi.fn()} />);
    expect(screen.getByText('flux-system')).toBeInTheDocument();
    expect(screen.getByText('apps')).toBeInTheDocument();
  });

  it('calls onSelect with namespace when clicked', () => {
    const onSelect = vi.fn();
    render(<Sidebar nodes={nodes} selected={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('flux-system'));
    expect(onSelect).toHaveBeenCalledWith('flux-system');
  });

  it('calls onSelect with null for All', () => {
    const onSelect = vi.fn();
    render(<Sidebar nodes={nodes} selected={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('All'));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('shows unhealthy dot for apps namespace (has Unhealthy node)', () => {
    render(<Sidebar nodes={nodes} selected={null} onSelect={vi.fn()} />);
    const appsButton = screen.getByText('apps').closest('button');
    expect(appsButton).toBeTruthy();
    const redDot = appsButton?.querySelector('.bg-red-500');
    expect(redDot).toBeTruthy();
  });
});
