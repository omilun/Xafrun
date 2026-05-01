'use client';

import React from 'react';
import { Layers, GitBranch, Box, Package, LayoutGrid } from 'lucide-react';
import { FluxNode, HealthStatus } from '../types';

interface SidebarProps {
  nodes: FluxNode[];
  selected: string | null; // namespace or null = "All"
  onSelect: (ns: string | null) => void;
}

const statusDot = (status: HealthStatus) => {
  if (status === 'Healthy') return 'bg-green-500';
  if (status === 'Unhealthy') return 'bg-red-500';
  if (status === 'Progressing') return 'bg-blue-400 animate-pulse';
  return 'bg-gray-300';
};

const nsIcon = (ns: string) => {
  if (ns === 'flux-system') return <GitBranch className="w-3.5 h-3.5" />;
  if (ns === 'monitoring') return <Layers className="w-3.5 h-3.5" />;
  if (['argo', 'argocd'].includes(ns)) return <Box className="w-3.5 h-3.5" />;
  return <Package className="w-3.5 h-3.5" />;
};

export const Sidebar = ({ nodes, selected, onSelect }: SidebarProps) => {
  // Collect unique namespaces, sorted: flux-system first, then alpha
  const namespaces = React.useMemo(() => {
    const map = new Map<string, FluxNode[]>();
    nodes.forEach((n) => {
      const list = map.get(n.namespace) ?? [];
      list.push(n);
      map.set(n.namespace, list);
    });
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === 'flux-system') return -1;
      if (b === 'flux-system') return 1;
      return a.localeCompare(b);
    });
  }, [nodes]);

  // Worst health status in a namespace
  const nsHealth = (nsNodes: FluxNode[]): HealthStatus => {
    if (nsNodes.some((n) => n.status === 'Unhealthy')) return 'Unhealthy';
    if (nsNodes.some((n) => n.status === 'Progressing')) return 'Progressing';
    if (nsNodes.every((n) => n.status === 'Healthy')) return 'Healthy';
    return 'Unknown';
  };

  return (
    <aside className="w-52 shrink-0 h-full bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
      <div className="px-4 py-3 border-b border-slate-100">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Namespaces</span>
      </div>

      {/* All */}
      <button
        onClick={() => onSelect(null)}
        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors w-full text-left ${
          selected === null
            ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-600'
            : 'text-slate-600 hover:bg-slate-50'
        }`}
      >
        <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1 truncate">All</span>
        <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 rounded px-1.5 py-0.5">
          {nodes.length}
        </span>
      </button>

      {/* Per-namespace tabs */}
      {namespaces.map(([ns, nsNodes]) => (
        <button
          key={ns}
          onClick={() => onSelect(ns)}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors w-full text-left ${
            selected === ns
              ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-600'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot(nsHealth(nsNodes))}`} />
          <span className="shrink-0 text-slate-400">{nsIcon(ns)}</span>
          <span className="flex-1 truncate text-xs">{ns}</span>
          <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 shrink-0">
            {nsNodes.length}
          </span>
        </button>
      ))}
    </aside>
  );
};
