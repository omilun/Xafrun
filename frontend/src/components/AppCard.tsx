'use client';

import React from 'react';
import { GitBranch, Package, Clock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { FluxNode, HealthStatus } from '@/types';

interface AppCardProps {
  node: FluxNode;
  onClick: () => void;
}

const HEALTH_BORDER: Record<HealthStatus, string> = {
  Healthy:     'border-l-green-500',
  Unhealthy:   'border-l-red-500',
  Progressing: 'border-l-blue-400',
  Unknown:     'border-l-slate-300',
};

const HEALTH_BG: Record<HealthStatus, string> = {
  Healthy:     'bg-green-50 dark:bg-green-950/10',
  Unhealthy:   'bg-red-50 dark:bg-red-950/10',
  Progressing: 'bg-blue-50 dark:bg-blue-950/10',
  Unknown:     'bg-slate-50 dark:bg-slate-950/10',
};

const KIND_BADGE: Record<string, string> = {
  Kustomization: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  HelmRelease:   'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

function HealthIcon({ status }: { status: HealthStatus }) {
  if (status === 'Healthy')
    return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  if (status === 'Unhealthy')
    return <AlertCircle className="w-4 h-4 text-red-500" />;
  if (status === 'Progressing')
    return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
  return <Clock className="w-4 h-4 text-slate-400" />;
}

export function AppCard({ node, onClick }: AppCardProps) {
  const borderColor = HEALTH_BORDER[node.status] ?? HEALTH_BORDER.Unknown;
  const badgeCls = KIND_BADGE[node.kind] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';

  return (
    <button
      onClick={onClick}
      className={`group w-full text-left bg-white dark:bg-gray-900 rounded-xl border border-slate-200
                  dark:border-gray-700 border-l-4 ${borderColor} shadow-sm hover:shadow-md
                  transition-all duration-200 hover:-translate-y-0.5 p-4 flex flex-col gap-3`}
    >
      {/* Top row: kind badge + health icon */}
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase ${badgeCls}`}>
          {node.kind}
        </span>
        <HealthIcon status={node.status} />
      </div>

      {/* Name */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-gray-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {node.name}
        </h3>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Package className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="text-[11px] text-slate-500 dark:text-gray-400 font-mono truncate">
            {node.namespace}
          </span>
        </div>
      </div>

      {/* Source ref */}
      {node.sourceRef && (
        <div className="flex items-start gap-1.5">
          <GitBranch className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
          <span className="text-[10px] text-slate-400 dark:text-gray-500 font-mono truncate">
            {node.sourceRef}
          </span>
        </div>
      )}

      {/* Message (only when unhealthy) */}
      {node.status === 'Unhealthy' && node.message && (
        <p className="text-[11px] text-red-600 dark:text-red-400 line-clamp-2 leading-relaxed">
          {node.message}
        </p>
      )}

      {/* Revision */}
      {node.revision && (
        <div className="pt-1 border-t border-slate-100 dark:border-gray-800">
          <span className="text-[10px] font-mono text-slate-400 dark:text-gray-600 truncate">
            {node.revision.length > 50 ? node.revision.slice(0, 50) + '…' : node.revision}
          </span>
        </div>
      )}
    </button>
  );
}
