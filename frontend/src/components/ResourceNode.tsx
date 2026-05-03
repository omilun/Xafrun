import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { CheckCircle2, AlertCircle, PauseCircle } from 'lucide-react';
import { FluxNode, HealthStatus, SyncStatus, InventoryItem } from '../types';

// ─── K8s resource category definitions ───────────────────────────────────────

interface KindStyle {
  stripe: string;   // left accent stripe color
  badge: string;    // badge background + text
  bg: string;       // node background
  border: string;   // node border
  label: string;    // short 2-4 char abbreviation
}

const KIND_STYLE: Record<string, KindStyle> = {
  // Workloads — blue
  Deployment:    { stripe: 'bg-blue-500',    badge: 'bg-blue-500 text-white',    bg: 'bg-blue-50 dark:bg-blue-950/30',    border: 'border-blue-200 dark:border-blue-800',    label: 'DEP'  },
  StatefulSet:   { stripe: 'bg-indigo-500',  badge: 'bg-indigo-500 text-white',  bg: 'bg-indigo-50 dark:bg-indigo-950/30', border: 'border-indigo-200 dark:border-indigo-800', label: 'STS'  },
  DaemonSet:     { stripe: 'bg-violet-500',  badge: 'bg-violet-500 text-white',  bg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-200 dark:border-violet-800', label: 'DS'   },
  ReplicaSet:    { stripe: 'bg-sky-500',     badge: 'bg-sky-500 text-white',     bg: 'bg-sky-50 dark:bg-sky-950/30',      border: 'border-sky-200 dark:border-sky-800',      label: 'RS'   },
  Job:           { stripe: 'bg-blue-400',    badge: 'bg-blue-400 text-white',    bg: 'bg-blue-50 dark:bg-blue-950/30',    border: 'border-blue-200 dark:border-blue-800',    label: 'JOB'  },
  CronJob:       { stripe: 'bg-cyan-600',    badge: 'bg-cyan-600 text-white',    bg: 'bg-cyan-50 dark:bg-cyan-950/30',    border: 'border-cyan-200 dark:border-cyan-800',    label: 'CRON' },
  Pod:           { stripe: 'bg-sky-400',     badge: 'bg-sky-400 text-white',     bg: 'bg-sky-50 dark:bg-sky-950/30',      border: 'border-sky-200 dark:border-sky-800',      label: 'POD'  },
  // Services — teal
  Service:       { stripe: 'bg-teal-500',    badge: 'bg-teal-500 text-white',    bg: 'bg-teal-50 dark:bg-teal-950/30',    border: 'border-teal-200 dark:border-teal-800',    label: 'SVC'  },
  // Networking — lime/green
  Ingress:       { stripe: 'bg-lime-600',    badge: 'bg-lime-600 text-white',    bg: 'bg-lime-50 dark:bg-lime-950/30',    border: 'border-lime-200 dark:border-lime-800',    label: 'ING'  },
  IngressRoute:  { stripe: 'bg-green-600',   badge: 'bg-green-600 text-white',   bg: 'bg-green-50 dark:bg-green-950/30',  border: 'border-green-200 dark:border-green-800',  label: 'INGR' },
  HTTPRoute:     { stripe: 'bg-emerald-600', badge: 'bg-emerald-600 text-white', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', label: 'HTTP' },
  Gateway:       { stripe: 'bg-green-500',   badge: 'bg-green-500 text-white',   bg: 'bg-green-50 dark:bg-green-950/30',  border: 'border-green-200 dark:border-green-800',  label: 'GW'   },
  // Config — amber
  ConfigMap:     { stripe: 'bg-amber-500',   badge: 'bg-amber-500 text-white',   bg: 'bg-amber-50 dark:bg-amber-950/30',  border: 'border-amber-200 dark:border-amber-800',  label: 'CM'   },
  Secret:        { stripe: 'bg-orange-500',  badge: 'bg-orange-500 text-white',  bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-800', label: 'SEC'  },
  PersistentVolumeClaim: { stripe: 'bg-stone-500', badge: 'bg-stone-500 text-white', bg: 'bg-stone-50 dark:bg-stone-950/30', border: 'border-stone-200 dark:border-stone-800', label: 'PVC'  },
  // RBAC — pink/rose
  ServiceAccount:        { stripe: 'bg-pink-500',  badge: 'bg-pink-500 text-white',  bg: 'bg-pink-50 dark:bg-pink-950/30',   border: 'border-pink-200 dark:border-pink-800',   label: 'SA'   },
  ClusterRole:           { stripe: 'bg-rose-600',  badge: 'bg-rose-600 text-white',  bg: 'bg-rose-50 dark:bg-rose-950/30',   border: 'border-rose-200 dark:border-rose-800',   label: 'CR'   },
  ClusterRoleBinding:    { stripe: 'bg-rose-500',  badge: 'bg-rose-500 text-white',  bg: 'bg-rose-50 dark:bg-rose-950/30',   border: 'border-rose-200 dark:border-rose-800',   label: 'CRB'  },
  Role:                  { stripe: 'bg-pink-600',  badge: 'bg-pink-600 text-white',  bg: 'bg-pink-50 dark:bg-pink-950/30',   border: 'border-pink-200 dark:border-pink-800',   label: 'ROLE' },
  RoleBinding:           { stripe: 'bg-pink-500',  badge: 'bg-pink-500 text-white',  bg: 'bg-pink-50 dark:bg-pink-950/30',   border: 'border-pink-200 dark:border-pink-800',   label: 'RB'   },
  // Namespace — slate
  Namespace:     { stripe: 'bg-slate-500',   badge: 'bg-slate-500 text-white',   bg: 'bg-slate-50 dark:bg-slate-900/30',  border: 'border-slate-200 dark:border-slate-700',  label: 'NS'   },
  // Cert-manager
  Certificate:   { stripe: 'bg-cyan-600',    badge: 'bg-cyan-600 text-white',    bg: 'bg-cyan-50 dark:bg-cyan-950/30',    border: 'border-cyan-200 dark:border-cyan-800',    label: 'CERT' },
  Issuer:        { stripe: 'bg-cyan-500',    badge: 'bg-cyan-500 text-white',    bg: 'bg-cyan-50 dark:bg-cyan-950/30',    border: 'border-cyan-200 dark:border-cyan-800',    label: 'ISS'  },
  ClusterIssuer: { stripe: 'bg-cyan-700',    badge: 'bg-cyan-700 text-white',    bg: 'bg-cyan-50 dark:bg-cyan-950/30',    border: 'border-cyan-200 dark:border-cyan-800',    label: 'CISS' },
};

const DEFAULT_KIND_STYLE: KindStyle = {
  stripe: 'bg-slate-400', badge: 'bg-slate-400 text-white',
  bg: 'bg-white dark:bg-gray-900', border: 'border-slate-200 dark:border-gray-700',
  label: '???',
};

function getKindStyle(kind: string): KindStyle {
  return KIND_STYLE[kind] ?? DEFAULT_KIND_STYLE;
}

// Kind accent for Flux node header stripe (by kind)
const FLUX_KIND_ACCENT: Record<string, string> = {
  GitRepository:         'bg-teal-500',
  OCIRepository:         'bg-cyan-500',
  HelmRepository:        'bg-purple-500',
  HelmChart:             'bg-violet-500',
  Bucket:                'bg-blue-400',
  Kustomization:         'bg-indigo-600',
  HelmRelease:           'bg-amber-500',
  ImageRepository:       'bg-orange-500',
  ImagePolicy:           'bg-orange-400',
  ImageUpdateAutomation: 'bg-orange-600',
  Receiver:              'bg-green-500',
  Alert:                 'bg-red-400',
  Provider:              'bg-pink-500',
};

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
  Healthy:     'border-green-400',
  Unhealthy:   'border-red-500',
  Progressing: 'border-amber-400',
  Unknown:     'border-slate-300',
};

const STATUS_DOT: Record<HealthStatus, string> = {
  Healthy:     'bg-green-500',
  Unhealthy:   'bg-red-500',
  Progressing: 'bg-amber-400 animate-pulse',
  Unknown:     'bg-slate-300',
};

const truncate = (s: string, max: number) =>
  s.length > max ? s.slice(0, max) + '…' : s;

// ─── K8s inventory node — ArgoCD-style with category color stripe ─────────────
export const K8sInventoryNode = memo(({ data }: { data: InventoryItem }) => {
  const style = getKindStyle(data.kind);
  return (
    <div
      className={`relative flex items-stretch rounded-lg border shadow-sm hover:shadow-md
                  transition-all cursor-pointer overflow-hidden ${style.bg} ${style.border}`}
      style={{ width: 200, minHeight: 56 }}
    >
      <Handle type="target" position={Position.Top} className="w-1.5 h-1.5 !bg-gray-400" />

      {/* Left accent stripe — category color */}
      <div className={`w-1.5 shrink-0 ${style.stripe}`} />

      {/* Content */}
      <div className="flex items-center gap-2 px-2.5 py-2 flex-1 min-w-0">
        <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${style.badge}`}>
          {style.label}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-slate-800 dark:text-gray-100 truncate leading-tight">
            {data.name}
          </div>
          {data.namespace && (
            <div className="text-[9px] text-slate-400 dark:text-gray-500 font-mono truncate">{data.namespace}</div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-1.5 h-1.5 !bg-gray-400" />
    </div>
  );
});
K8sInventoryNode.displayName = 'K8sInventoryNode';

// ─── Flux resource node ────────────────────────────────────────────────────────
const ResourceNode = ({ data }: { data: FluxNode & { _layout?: 'lr' | 'tb' } }) => {
  const isLR = data._layout === 'lr';
  const sourcePos = isLR ? Position.Right : Position.Bottom;
  const targetPos = isLR ? Position.Left  : Position.Top;

  const border    = STATUS_BORDER[data.status] ?? STATUS_BORDER.Unknown;
  const dot       = STATUS_DOT[data.status]    ?? STATUS_DOT.Unknown;
  const accent    = FLUX_KIND_ACCENT[data.kind] ?? 'bg-slate-400';

  const bottomText = data.message
    ? truncate(data.message, 45)
    : data.sourceRef
    ? truncate(data.sourceRef, 45)
    : null;

  return (
    <div
      className={`relative flex items-stretch rounded-lg border-2 shadow-sm hover:shadow-md
                  transition-all bg-white dark:bg-gray-900 overflow-hidden ${border}`}
      style={{ width: 240, minHeight: 80 }}
    >
      <Handle type="target" position={targetPos} className="w-2 h-2 !bg-gray-300" />

      {/* Left kind-accent stripe */}
      <div className={`w-1.5 shrink-0 ${accent}`} />

      {/* Content */}
      <div className="flex flex-col justify-between px-3 py-2.5 flex-1 min-w-0">
        {/* Status dot — top-right */}
        <span
          className={`absolute top-2 right-2 w-2 h-2 rounded-full ${dot}`}
          aria-label={data.status}
        />

        {/* Top row: kind label and badges */}
        <div className="flex items-center justify-between">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider text-white ${accent}`}>
            {data.kind}
          </span>
          <div className="flex items-center gap-1 ml-6">
            <SuspendedBadge suspended={data.suspended} />
            <SyncStatusBadge status={data.syncStatus} />
          </div>
        </div>

        {/* Middle row: name */}
        <span className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate mt-1.5">
          {data.name}
        </span>

        {/* Bottom row: message / sourceRef */}
        {bottomText && (
          <span className="text-[10px] text-slate-400 dark:text-gray-500 truncate mt-0.5">
            {bottomText}
          </span>
        )}
      </div>

      <Handle type="source" position={sourcePos} className="w-2 h-2 !bg-gray-300" />
    </div>
  );
};

export default memo(ResourceNode);
