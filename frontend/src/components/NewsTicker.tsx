import React, { useState, useMemo } from 'react';
import { ChevronDown, TowerControl } from 'lucide-react';
import { FluxNode, ClusterInfo } from '../types';

interface NewsTickerProps {
  nodes: FluxNode[];
  info: ClusterInfo | null;
  /** When true, renders as a compact inline chip instead of a floating bottom bar */
  inline?: boolean;
}

export function NewsTicker({ nodes, info, inline }: NewsTickerProps) {
  const [userExpanded, setUserExpanded] = useState(false);

  const unhealthy = nodes.filter(
    (n) => n.status === 'Unhealthy' || n.status === 'Progressing'
  );
  const isHealthy = unhealthy.length === 0;

  const expanded = !isHealthy || userExpanded;

  const tickerText = useMemo(() => {
    if (!isHealthy) {
      return unhealthy
        .map((n) => {
          const raw = n.message ?? 'Unknown error';
          const msg = raw.length > 70 ? raw.slice(0, 70) + '…' : raw;
          return `${n.name} is unhealthy. The error is: ${msg}`;
        })
        .join('  •  ');
    }

    if (info) {
      return (
        `The resources on cluster ${info.clusterName} are healthy. ` +
        `Flux version: ${info.fluxVersion || '—'}, ` +
        `Kubernetes version: ${info.k8sVersion || '—'}, ` +
        `OS: Talos Linux ${info.osImage || '—'}, ` +
        `CNI: ${info.cniVersion || '—'}, ` +
        `Ingress Controller: ${info.ingressController || '—'}`
      );
    }

    return 'All cluster resources are healthy.';
  }, [info, isHealthy, unhealthy]);

  const duration = Math.max(20, Math.ceil(tickerText.length * 0.15));
  const colorClass = isHealthy ? 'text-green-500' : 'text-red-500';
  const glowClass  = isHealthy ? 'shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'shadow-[0_0_15px_rgba(239,68,68,0.4)]';
  const bgClass    = isHealthy ? 'bg-emerald-50/90' : 'bg-red-50/90';
  const textClass  = isHealthy ? 'text-emerald-900' : 'text-red-900';

  /* ── Inline mode: compact chip in the toolbar ── */
  if (inline) {
    return (
      <div className={`flex items-center gap-1.5 h-7 rounded-full border px-2.5 overflow-hidden max-w-[320px]
                       ${isHealthy
                         ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
                         : 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
                       }`}>
        <style>{`
          @keyframes xafrun-ticker-inline {
            0%   { transform: translateX(0); }
            100% { transform: translateX(calc(-100% + 240px)); }
          }
          .xafrun-ticker-inline {
            animation: xafrun-ticker-inline ${duration}s linear infinite alternate;
            white-space: nowrap;
            display: inline-block;
          }
        `}</style>
        <TowerControl className={`w-3.5 h-3.5 shrink-0 ${colorClass}`} />
        <div className="overflow-hidden relative flex-1">
          <span className={`xafrun-ticker-inline text-[10px] font-semibold ${textClass} uppercase tracking-tight`}>
            {tickerText}
          </span>
        </div>
      </div>
    );
  }

  /* ── Floating mode (original, non-inline) ── */
  if (!expanded) {
    return (
      <button
        className={`fixed bottom-4 left-4 p-2 bg-white dark:bg-gray-900 rounded-full border border-black/5 shadow-xl z-50 transition-all hover:scale-110 ${glowClass} ${colorClass}`}
        onClick={() => setUserExpanded(true)}
        title="Show Status"
      >
        <TowerControl className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-4 left-4 h-9 max-w-[80vw] ${bgClass} border border-black/5 shadow-2xl
                  rounded-xl flex items-center z-50 overflow-hidden select-none backdrop-blur-md transition-all`}
    >
      <style>{`
        @keyframes xafrun-ticker {
          0%   { transform: translateX(20px); }
          100% { transform: translateX(calc(-100% + 400px)); }
        }
        .xafrun-ticker-text {
          animation: xafrun-ticker ${duration}s linear infinite alternate;
          white-space: nowrap;
          display: inline-block;
        }
      `}</style>

      <div className={`px-2 h-full flex items-center bg-white/40 dark:bg-black/20 ${colorClass} shrink-0`}>
        <TowerControl className="w-4 h-4" />
      </div>

      <div className="flex-1 overflow-hidden relative h-full flex items-center min-w-[300px]">
        <span className={`xafrun-ticker-text text-[11px] font-bold ${textClass} px-4 uppercase tracking-tight`}>
          {tickerText}
        </span>
      </div>

      <button
        onClick={() => setUserExpanded(false)}
        className={`px-3 h-full flex items-center hover:bg-black/5 transition-colors shrink-0 ${textClass}`}
      >
        <ChevronDown className="w-4 h-4" />
      </button>
    </div>
  );
}
