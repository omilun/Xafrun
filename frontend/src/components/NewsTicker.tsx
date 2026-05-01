'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { FluxNode, ClusterInfo } from '../types';

interface NewsTickerProps {
  nodes: FluxNode[];
  info: ClusterInfo | null;
}

export function NewsTicker({ nodes, info }: NewsTickerProps) {
  const [expanded, setExpanded] = useState(true);

  const unhealthy = nodes.filter(
    (n) => n.status === 'Unhealthy' || n.status === 'Progressing'
  );
  const isHealthy = unhealthy.length === 0;

  // Build ticker messages.
  const tickerText = useMemo(() => {
    if (!isHealthy) {
      return unhealthy
        .map((n) => {
          const raw = n.message ?? 'Unknown error';
          const msg = raw.length > 70 ? raw.slice(0, 70) + '…' : raw;
          return `⚠ ${n.name} (${n.namespace}) is unhealthy. The error is: ${msg}`;
        })
        .join('     •     ');
    }

    if (info) {
      return (
        `✔ The resources on cluster ${info.clusterName} are healthy.` +
        `  Flux version: ${info.fluxVersion || '—'},` +
        `  Kubernetes version: ${info.k8sVersion || '—'},` +
        `  OS: ${info.talosVersion || '—'},` +
        `  CNI: Cilium ${info.ciliumVersion || '—'},` +
        `  Ingress Controller: ${info.ingressController || '—'}`
      );
    }

    return '✔ All cluster resources are healthy.';
  }, [nodes, info, isHealthy, unhealthy]);

  // Animation speed: ~80px per second, minimum 20s.
  const duration = Math.max(20, Math.ceil(tickerText.length * 0.15));

  const accent = isHealthy
    ? { bar: 'bg-green-500', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' }
    : { bar: 'bg-red-500', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' };

  /* ── Collapsed: thin coloured strip ── */
  if (!expanded) {
    return (
      <div
        className={`fixed bottom-0 left-0 right-0 h-1.5 ${accent.bar} cursor-pointer z-50
                    transition-all hover:h-2.5`}
        onClick={() => setExpanded(true)}
        title="Click to expand status bar"
      />
    );
  }

  /* ── Expanded: full ticker ── */
  return (
    <div
      className={`fixed bottom-0 left-0 right-0 h-9 ${accent.bg} ${accent.border}
                  border-t flex items-center z-50 overflow-hidden select-none`}
    >
      {/* inject keyframe animation */}
      <style>{`
        @keyframes fluxbaan-ticker {
          0%   { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
        .fluxbaan-ticker-text {
          animation: fluxbaan-ticker ${duration}s linear infinite;
          white-space: nowrap;
          display: inline-block;
        }
      `}</style>

      {/* scrolling text */}
      <div className="flex-1 overflow-hidden relative h-full flex items-center">
        <span className={`fluxbaan-ticker-text text-xs font-medium ${accent.text} pl-4`}>
          {tickerText}
        </span>
      </div>

      {/* collapse button */}
      <button
        onClick={() => setExpanded(false)}
        className={`px-2.5 h-full flex items-center hover:bg-black/5 transition-colors shrink-0 ${accent.text}`}
        title="Collapse status bar"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
