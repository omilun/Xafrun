import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { CheckCircle2, AlertCircle, PauseCircle } from 'lucide-react';
import { FluxNode, HealthStatus, SyncStatus, InventoryItem } from '../types';

// ─── Sync Status Badge ────────────────────────────────────────────────────────
function SyncStatusBadge({ status }: { status?: SyncStatus }) {
  if (!status || status === 'Unknown') return null;
  
  if (status === 'Synced') {
    return (
      <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-tighter">
        <CheckCircle2 className="w-2.5 h-2.5" />
        Synced
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 uppercase tracking-tighter">
      <AlertCircle className="w-2.5 h-2.5" />
      Out Of Sync
    </div>
  );
}

// ─── Suspended Badge ─────────────────────────────────────────────────────────
function SuspendedBadge({ suspended }: { suspended?: boolean }) {
  if (!suspended) return null;
  return (
    <div className="flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 uppercase tracking-tighter ml-auto mr-1">
      <PauseCircle className="w-2.5 h-2.5" />
      Suspended
    </div>
  );
}

// ─── Flux resource node (existing) ────────────────────────────────────────────

const STATUS_BORDER: Record<HealthStatus, string> = {
  Healthy:     'border-green-500',
  Unhealthy:   'border-red-500',
  Progressing: 'border-amber-400',
  Unknown:     'border-slate-300',
};

const STATUS_DOT: Record<HealthStatus, string> = {
  Healthy:     'bg-green-500',
  Unhealthy:   'bg-red-500',
  Progressing: 'bg-amber-400',
  Unknown:     'bg-slate-300',
};

const truncate = (s: string, max: number) =>
  s.length > max ? s.slice(0, max) + '…' : s;

// Map k8s kind to a short 2-letter badge colour
const K8S_KIND_COLOUR: Record<string, string> = {
  Deployment:            'bg-blue-100 text-blue-700',
  StatefulSet:           'bg-indigo-100 text-indigo-700',
  DaemonSet:             'bg-violet-100 text-violet-700',
  Service:               'bg-cyan-100 text-cyan-700',
  ConfigMap:             'bg-amber-100 text-amber-700',
  Secret:                'bg-orange-100 text-orange-700',
  ServiceAccount:        'bg-teal-100 text-teal-700',
  ClusterRole:           'bg-pink-100 text-pink-700',
  ClusterRoleBinding:    'bg-rose-100 text-rose-700',
  Role:                  'bg-pink-100 text-pink-700',
  RoleBinding:           'bg-rose-100 text-rose-700',
  Ingress:               'bg-lime-100 text-lime-700',
  PersistentVolumeClaim: 'bg-stone-100 text-stone-700',
  Namespace:             'bg-slate-100 text-slate-600',
};

function kindBadgeCls(kind: string) {
  return K8S_KIND_COLOUR[kind] ?? 'bg-slate-100 text-slate-600';
}

// ─── K8s inventory node ────────────────────────────────────────────────────────
export const K8sInventoryNode = memo(({ data }: { data: InventoryItem }) => {
  return (
    <div
      className="relative flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-200
                 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md
                 transition-shadow cursor-pointer"
      style={{ width: 200, minHeight: 52 }}
    >
      <Handle type="target" position={Position.Top} className="w-1.5 h-1.5 !bg-gray-300" />

      <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${kindBadgeCls(data.kind)}`}>
        {data.kind.slice(0, 3)}
      </span>

      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-slate-800 dark:text-gray-100 truncate">
          {data.name}
        </div>
        {data.namespace && (
          <div className="text-[10px] text-slate-400 font-mono truncate">{data.namespace}</div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-1.5 h-1.5 !bg-gray-300" />
    </div>
  );
});
K8sInventoryNode.displayName = 'K8sInventoryNode';

// ─── Flux resource node ────────────────────────────────────────────────────────
const ResourceNode = ({ data }: { data: FluxNode }) => {
  const border = STATUS_BORDER[data.status] ?? STATUS_BORDER.Unknown;
  const dot    = STATUS_DOT[data.status]    ?? STATUS_DOT.Unknown;

  const bottomText = data.message
    ? truncate(data.message, 45)
    : data.sourceRef
    ? truncate(data.sourceRef, 45)
    : null;

  return (
    <div
      className={`relative flex flex-col justify-between px-3 py-2.5 rounded border-2
                  shadow-sm hover:shadow-md transition-shadow
                  bg-white dark:bg-gray-900
                  ${border}`}
      style={{ width: 260, minHeight: 80 }}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-gray-300" />

      {/* Status dot — top-right */}
      <span
        className={`absolute top-2 right-2 w-2 h-2 rounded-full ${dot}`}
        aria-label={data.status}
      />

      {/* Top row: kind label and sync status */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 pr-4">
          {data.kind}
        </span>
        <div className="flex items-center gap-1">
          <SuspendedBadge suspended={data.suspended} />
          <SyncStatusBadge status={data.syncStatus} />
        </div>
      </div>

      {/* Middle row: name */}
      <span className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate mt-0.5">
        {data.name}
      </span>

      {/* Bottom row: message / sourceRef */}
      {bottomText && (
        <span className="text-[10px] text-slate-400 truncate mt-1">
          {bottomText}
        </span>
      )}

      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-gray-300" />
    </div>
  );
};

export default memo(ResourceNode);

