import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { FluxNode, HealthStatus } from '../types';

const STATUS_BORDER: Record<HealthStatus, string> = {
  Healthy:     'border-green-500',
  Unhealthy:   'border-red-500',
  Progressing: 'border-amber-400',
  Unknown:     'border-slate-300',
};

const STATUS_BG: Record<HealthStatus, string> = {
  Healthy:     'bg-green-50/10 dark:bg-green-950/20',
  Unhealthy:   'bg-red-50/10 dark:bg-red-950/20',
  Progressing: 'bg-amber-50/10 dark:bg-amber-950/20',
  Unknown:     'bg-slate-50/10 dark:bg-slate-950/20',
};

const STATUS_DOT: Record<HealthStatus, string> = {
  Healthy:     'bg-green-500',
  Unhealthy:   'bg-red-500',
  Progressing: 'bg-amber-400',
  Unknown:     'bg-slate-300',
};

const truncate = (s: string, max: number) =>
  s.length > max ? s.slice(0, max) + '…' : s;

const ResourceNode = ({ data }: { data: FluxNode }) => {
  const border = STATUS_BORDER[data.status] ?? STATUS_BORDER.Unknown;
  const bg     = STATUS_BG[data.status]     ?? STATUS_BG.Unknown;
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
                  ${border} ${bg}`}
      style={{ width: 260, minHeight: 80 }}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-gray-300" />

      {/* Status dot — top-right */}
      <span
        className={`absolute top-2 right-2 w-2 h-2 rounded-full ${dot}`}
        aria-label={data.status}
      />

      {/* Top row: kind label */}
      <span className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 pr-4">
        {data.kind}
      </span>

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

