'use client';

import React, { useRef } from 'react';
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2, Clock } from 'lucide-react';
import type { ReactFlowInstance } from 'reactflow';
import { FluxNode, FluxGraph, HealthStatus } from '@/types';
import { extractAppSubtree } from '@/lib/filterGraph';
import FluxTree from './FluxTree';
import { ResourceDrawer, DrawerNode } from './ResourceDrawer';
import { ErrorBoundary } from './ErrorBoundary';
import { useState } from 'react';

interface AppDetailProps {
  app: FluxNode;
  graph: FluxGraph;
  onBack: () => void;
}

function StatusIcon({ status }: { status: HealthStatus }) {
  if (status === 'Healthy')
    return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  if (status === 'Unhealthy')
    return <AlertCircle className="w-4 h-4 text-red-500" />;
  if (status === 'Progressing')
    return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
  return <Clock className="w-4 h-4 text-slate-400" />;
}

export function AppDetail({ app, graph, onBack }: AppDetailProps) {
  const [selectedNode, setSelectedNode] = useState<DrawerNode | null>(null);
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);

  const subgraph = extractAppSubtree(graph, app.id);

  return (
    <div className="flex flex-col h-full">
      {/* Detail header */}
      <div className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-gray-400
                     hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-2 py-1 rounded-md
                     hover:bg-slate-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Apps
        </button>

        <span className="text-slate-300 dark:text-gray-600">/</span>

        <div className="flex items-center gap-2">
          <StatusIcon status={app.status} />
          <span className="text-sm font-bold text-slate-900 dark:text-gray-100">{app.name}</span>
          <span className="text-xs text-slate-400 dark:text-gray-500 font-mono">{app.namespace}</span>
        </div>

        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase ${
          app.kind === 'Kustomization'
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
            : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
        }`}>
          {app.kind}
        </span>
      </div>

      {/* Graph canvas */}
      <div className="flex-1 relative overflow-hidden">
        <ErrorBoundary>
          <FluxTree
            data={subgraph}
            focusedApp={app}
            onNodeClick={setSelectedNode}
            rfInstanceRef={rfInstanceRef}
          />
        </ErrorBoundary>
      </div>

      {/* Resource drawer for clicked nodes */}
      <ResourceDrawer
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  );
}
