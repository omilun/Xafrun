import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronDown, TowerControl, X, Globe, Cpu, Layers, Server } from 'lucide-react';
import { FluxNode, ClusterInfo } from '../types';

interface NewsTickerProps {
  nodes: FluxNode[];
  info: ClusterInfo | null;
  /** When true, renders as a compact inline chip instead of a floating bottom bar */
  inline?: boolean;
}

export function NewsTicker({ nodes, info, inline }: NewsTickerProps) {
  const [userExpanded, setUserExpanded] = useState(false);
  const [inlineOpen, setInlineOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const unhealthy = nodes.filter(
    (n) => n.status === 'Unhealthy' || n.status === 'Progressing'
  );
  const isHealthy = unhealthy.length === 0;

  const expanded = !isHealthy || userExpanded;

  // Close inline panel on outside click
  useEffect(() => {
    if (!inlineOpen) return;
    function handle(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setInlineOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [inlineOpen]);

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
  const colorClass = isHealthy ? 'text-emerald-500' : 'text-red-500';
  const glowClass  = isHealthy ? 'shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'shadow-[0_0_15px_rgba(239,68,68,0.4)]';
  const bgClass    = isHealthy ? 'bg-emerald-50/90' : 'bg-red-50/90';
  const textClass  = isHealthy ? 'text-emerald-900' : 'text-red-900';

  /* ── Inline mode: icon-only chip with expandable panel ── */
  if (inline) {
    return (
      <div className="relative">
        {/* Icon trigger button */}
        <button
          ref={btnRef}
          onClick={() => setInlineOpen(o => !o)}
          title={isHealthy ? 'Cluster healthy' : `${unhealthy.length} unhealthy resource(s)`}
          className={`flex items-center justify-center w-7 h-7 rounded-full border transition-colors
            ${isHealthy
              ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
              : 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40'
            }`}
        >
          <TowerControl className={`w-3.5 h-3.5 ${colorClass}`} />
        </button>

        {/* Accordion panel */}
        {inlineOpen && (
          <div
            ref={panelRef}
            className={`absolute top-full mt-2 right-0 z-50 w-80 rounded-xl border shadow-xl overflow-hidden
              ${isHealthy
                ? 'bg-emerald-50 border-emerald-200 dark:bg-gray-900 dark:border-emerald-800'
                : 'bg-red-50 border-red-200 dark:bg-gray-900 dark:border-red-800'
              }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-3 py-2 border-b
              ${isHealthy ? 'border-emerald-200 dark:border-emerald-800' : 'border-red-200 dark:border-red-800'}`}>
              <div className="flex items-center gap-1.5">
                <TowerControl className={`w-3.5 h-3.5 ${colorClass}`} />
                <span className={`text-[10px] font-bold uppercase tracking-widest ${colorClass}`}>
                  {isHealthy ? 'Cluster Healthy' : `${unhealthy.length} Issue${unhealthy.length > 1 ? 's' : ''} Detected`}
                </span>
              </div>
              <button onClick={() => setInlineOpen(false)} className="p-0.5 hover:opacity-60 transition-opacity">
                <X className="w-3 h-3 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="px-3 py-2.5 flex flex-col gap-2">
              {!isHealthy ? (
                /* Error list */
                unhealthy.map((n) => (
                  <div key={n.name} className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wide">
                      {n.name} <span className="font-normal opacity-70">({n.kind})</span>
                    </span>
                    <span className="text-[10px] text-red-800 dark:text-red-300 leading-relaxed break-words">
                      {n.message || 'Unknown error'}
                    </span>
                  </div>
                ))
              ) : info ? (
                /* Healthy cluster info */
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-800 dark:text-emerald-300">
                    <Globe className="w-3 h-3 shrink-0" />
                    <span className="font-medium">K8s</span>
                    <span className="opacity-70 truncate">{info.k8sVersion || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-800 dark:text-emerald-300">
                    <TowerControl className="w-3 h-3 shrink-0" />
                    <span className="font-medium">Flux</span>
                    <span className="opacity-70 truncate">{info.fluxVersion || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-800 dark:text-emerald-300">
                    <Layers className="w-3 h-3 shrink-0" />
                    <span className="font-medium">CNI</span>
                    <span className="opacity-70 truncate">{info.cniVersion || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-800 dark:text-emerald-300">
                    <Cpu className="w-3 h-3 shrink-0" />
                    <span className="font-medium">OS</span>
                    <span className="opacity-70 truncate">{info.osImage || '—'}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5 text-[10px] text-emerald-800 dark:text-emerald-300">
                    <Server className="w-3 h-3 shrink-0" />
                    <span className="font-medium">Ingress</span>
                    <span className="opacity-70 truncate">{info.ingressController || '—'}</span>
                  </div>
                </div>
              ) : (
                <span className="text-[10px] text-emerald-800 dark:text-emerald-300">
                  All cluster resources are healthy.
                </span>
              )}
            </div>
          </div>
        )}
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
