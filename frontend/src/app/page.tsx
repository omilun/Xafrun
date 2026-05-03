'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Activity, RefreshCcw, Search, X } from 'lucide-react';
import type { ReactFlowInstance } from 'reactflow';
import { AppList } from '@/components/AppList';
import { AppDetail } from '@/components/AppDetail';
import { NewsTicker } from '@/components/NewsTicker';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CommandPalette } from '@/components/CommandPalette';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { FluxGraph, FluxNode, ClusterInfo, APP_KINDS, isOrchestratorKustomization } from '@/types';

type ConnStatus = 'connecting' | 'live' | 'error';
type HealthFilter = 'all' | 'Healthy' | 'Unhealthy' | 'Progressing';

const FILTER_CONFIG: { key: HealthFilter; label: string; dot: string; text: string; active: string }[] = [
  { key: 'all',         label: 'All',         dot: 'bg-slate-400',  text: 'text-slate-600 dark:text-gray-300',   active: 'bg-slate-700 dark:bg-gray-700 text-white border-slate-700 dark:border-gray-600' },
  { key: 'Healthy',     label: 'Healthy',     dot: 'bg-green-500',  text: 'text-green-700 dark:text-green-400',  active: 'bg-green-600 text-white border-green-600' },
  { key: 'Unhealthy',   label: 'Unhealthy',   dot: 'bg-red-500',    text: 'text-red-700 dark:text-red-400',      active: 'bg-red-600 text-white border-red-600' },
  { key: 'Progressing', label: 'Progressing', dot: 'bg-blue-400',   text: 'text-blue-700 dark:text-blue-400',    active: 'bg-blue-500 text-white border-blue-500' },
];

export default function Home() {
  const [graph, setGraph]             = useState<FluxGraph | null>(null);
  const [status, setStatus]           = useState<ConnStatus>('connecting');
  const [error, setError]             = useState(false);
  const [info, setInfo]               = useState<ClusterInfo | null>(null);
  const [selectedApp, setSelectedApp] = useState<FluxNode | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [search, setSearch]           = useState('');
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');

  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);

  const apps = useMemo(() => {
    if (!graph) return [];
    return graph.nodes.filter((n) => APP_KINDS.has(n.kind) && !isOrchestratorKustomization(n));
  }, [graph]);

  const counts = useMemo(() => ({
    all:         apps.length,
    Healthy:     apps.filter((n) => n.status === 'Healthy').length,
    Unhealthy:   apps.filter((n) => n.status === 'Unhealthy').length,
    Progressing: apps.filter((n) => n.status === 'Progressing').length,
  }), [apps]);

  const filteredApps = useMemo(() => apps.filter((n) => {
    const matchesSearch  = !search || n.name.toLowerCase().includes(search.toLowerCase()) || n.namespace.toLowerCase().includes(search.toLowerCase());
    const matchesHealth  = healthFilter === 'all' || n.status === healthFilter;
    return matchesSearch && matchesHealth;
  }), [apps, search, healthFilter]);

  useEffect(() => {
    fetch('/api/info').then((r) => r.json()).then((d) => setInfo(d)).catch(() => {});
  }, []);

  const connect = useCallback(() => {
    fetch('/api/tree').then((r) => r.json()).then((data) => setGraph(data)).catch(() => {});
    const es = new EventSource('/api/events');
    es.addEventListener('graph', (e: MessageEvent) => {
      try { setGraph(JSON.parse(e.data)); setStatus('live'); } catch { /* ignore */ }
    });
    es.onerror = () => { setStatus('error'); setError(true); es.close(); };
    return () => es.close();
  }, []);

  useEffect(() => { const cleanup = connect(); return cleanup; }, [connect]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSelectFromPalette = useCallback((node: FluxNode) => {
    setSelectedApp(node);
    const inst = rfInstanceRef.current;
    if (inst) {
      const rfNode = inst.getNode(node.id);
      if (rfNode) inst.setCenter(rfNode.position.x + 140, rfNode.position.y + 60, { duration: 400, zoom: 1 });
    }
  }, []);

  const clearFilters = useCallback(() => { setSearch(''); setHealthFilter('all'); }, []);

  const hasActiveFilter = search !== '' || healthFilter !== 'all';

  return (
    <main className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-gray-950">

      {/* ── Global header ───────────────────────────────────────────── */}
      <header className="h-14 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700
                         px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
        {/* Logo */}
        <button
          onClick={() => { setSelectedApp(null); clearFilters(); }}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity shrink-0"
        >
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div className="text-left leading-none">
            <span className="text-sm font-bold text-slate-900 dark:text-gray-100 tracking-tight">Xafrun</span>
            <p className="text-[9px] text-slate-400 dark:text-gray-500 font-medium uppercase tracking-widest mt-0.5">
              GitOps Dashboard
            </p>
          </div>
        </button>

        {/* Right: cluster info + connection status */}
        <div className="flex items-center gap-3 shrink-0">
          {info?.clusterName && (
            <span className="text-[10px] font-mono text-slate-400 dark:text-gray-500 hidden sm:block">
              {info.clusterName}
            </span>
          )}
          <div className="h-4 w-[1px] bg-slate-200 dark:bg-gray-700" />
          <ThemeToggle />
          <div className="h-4 w-[1px] bg-slate-200 dark:bg-gray-700" />
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${
              status === 'live'  ? 'bg-green-500 animate-pulse' :
              status === 'error' ? 'bg-red-500' : 'bg-yellow-400 animate-pulse'
            }`} />
            <span className="text-xs font-semibold text-slate-600 dark:text-gray-300">
              {status === 'live' ? 'Live' : status === 'error' ? 'Disconnected' : 'Connecting…'}
            </span>
          </div>
        </div>
      </header>

      {/* ── Toolbar: search + filter chips (merged stats + filters) ─── */}
      {!selectedApp && graph && (
        <div className="shrink-0 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700 px-6 py-2.5 flex items-center gap-4 shadow-xs z-10">
          {/* Search */}
          <div className="relative w-64 shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search applications…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-gray-700
                         bg-slate-50 dark:bg-gray-800 text-slate-700 dark:text-gray-300
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all"
            />
          </div>

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-gray-700 shrink-0" />

          {/* Merged stat + filter chips — clicking filters the list */}
          <div className="flex items-center gap-2 flex-1">
            {FILTER_CONFIG.map(({ key, label, dot, text, active }) => {
              const count = key === 'all' ? counts.all : counts[key as keyof typeof counts];
              const isActive = healthFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => setHealthFilter(isActive && key !== 'all' ? 'all' : key)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-semibold
                              transition-all duration-150 ${
                    isActive
                      ? `${active} border-transparent shadow-sm`
                      : `border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 ${text} hover:border-slate-300 dark:hover:border-gray-600`
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white/80' : dot}`} />
                  <span>{label}</span>
                  <span className={`font-bold tabular-nums ${isActive ? 'text-white/90' : ''}`}>{count}</span>
                </button>
              );
            })}

            {/* Clear filters button */}
            {hasActiveFilter && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold
                           text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200
                           border border-dashed border-slate-300 dark:border-gray-600 hover:border-slate-400
                           transition-all"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>

          {/* Showing N of M */}
          {(search || healthFilter !== 'all') && (
            <span className="text-[10px] text-slate-400 dark:text-gray-500 shrink-0 font-mono">
              {filteredApps.length} / {counts.all}
            </span>
          )}
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden pb-9">
        {status === 'connecting' && !graph ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <Loader />
              <p className="text-sm font-medium text-slate-500 dark:text-gray-400">
                Connecting to Flux Controller…
              </p>
            </div>
          </div>
        ) : error && !graph ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl border border-red-100 dark:border-red-900
                            flex flex-col items-center gap-4 max-w-md text-center">
              <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-full text-red-500">
                <RefreshCcw className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-gray-100">Backend Connection Failed</h2>
              <p className="text-sm text-slate-500 dark:text-gray-400">Could not reach the Xafrun backend.</p>
              <button
                onClick={connect}
                className="mt-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all shadow-md"
              >
                Retry Connection
              </button>
            </div>
          </div>
        ) : graph ? (
          <ErrorBoundary>
            {selectedApp ? (
              <AppDetail app={selectedApp} graph={graph} onBack={() => setSelectedApp(null)} />
            ) : (
              <AppList nodes={filteredApps} onSelectApp={setSelectedApp} />
            )}
          </ErrorBoundary>
        ) : null}
      </div>

      {/* ── News Ticker ───────────────────────────────────────────── */}
      {graph && <NewsTicker nodes={graph.nodes} info={info} />}

      {/* ── Command Palette ───────────────────────────────────────── */}
      <CommandPalette
        nodes={graph?.nodes ?? []}
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelect={handleSelectFromPalette}
      />
    </main>
  );
}

const Loader = () => (
  <div className="relative w-12 h-12">
    <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
    <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin" />
  </div>
);



