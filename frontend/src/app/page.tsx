'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Activity, RefreshCcw, Search } from 'lucide-react';
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

export default function Home() {
  const [graph, setGraph]         = useState<FluxGraph | null>(null);
  const [status, setStatus]       = useState<ConnStatus>('connecting');
  const [error, setError]         = useState(false);
  const [info, setInfo]           = useState<ClusterInfo | null>(null);
  const [selectedApp, setSelectedApp] = useState<FluxNode | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');

  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);

  // Stats calculation
  const apps = useMemo(() => {
    if (!graph) return [];
    return graph.nodes.filter((n) => APP_KINDS.has(n.kind) && !isOrchestratorKustomization(n));
  }, [graph]);

  const stats = useMemo(() => ({
    total:       apps.length,
    healthy:     apps.filter((n) => n.status === 'Healthy').length,
    unhealthy:   apps.filter((n) => n.status === 'Unhealthy').length,
    progressing: apps.filter((n) => n.status === 'Progressing').length,
  }), [apps]);

  const filteredApps = useMemo(() => {
    return apps.filter((n) => {
      const matchesSearch =
        !search ||
        n.name.toLowerCase().includes(search.toLowerCase()) ||
        n.namespace.toLowerCase().includes(search.toLowerCase());
      const matchesHealth =
        healthFilter === 'all' || n.status === healthFilter;
      return matchesSearch && matchesHealth;
    });
  }, [apps, search, healthFilter]);

  useEffect(() => {
    fetch('/api/info')
      .then((r) => r.json())
      .then((d) => setInfo(d))
      .catch(() => {});
  }, []);

  const connect = useCallback(() => {
    fetch('/api/tree')
      .then((r) => r.json())
      .then((data) => setGraph(data))
      .catch(() => {});

    const es = new EventSource('/api/events');
    es.addEventListener('graph', (e: MessageEvent) => {
      try {
        setGraph(JSON.parse(e.data));
        setStatus('live');
      } catch { /* ignore */ }
    });
    es.onerror = () => {
      setStatus('error');
      setError(true);
      es.close();
    };
    return () => es.close();
  }, []);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  // ⌘K / Ctrl-K
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

  // When command palette selects a node, navigate to its app detail
  const handleSelectFromPalette = useCallback((node: FluxNode) => {
    setSelectedApp(node);
    const inst = rfInstanceRef.current;
    if (inst) {
      const rfNode = inst.getNode(node.id);
      if (rfNode) {
        inst.setCenter(rfNode.position.x + 140, rfNode.position.y + 60, { duration: 400, zoom: 1 });
      }
    }
  }, []);

  return (
    <main className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-gray-950">
      {/* ── Global header ───────────────────────────────────────────── */}
      <header className="h-16 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700
                         px-6 flex items-center justify-between shrink-0 shadow-sm z-10 gap-8">
        <div className="flex items-center gap-8 shrink-0">
          <button
            onClick={() => { setSelectedApp(null); setSearch(''); setHealthFilter('all'); }}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <span className="text-base font-bold text-slate-900 dark:text-gray-100 tracking-tight leading-tight">Xafrun</span>
              <p className="text-[9px] text-slate-400 dark:text-gray-500 font-medium uppercase tracking-widest leading-none">
                GitOps Dashboard
              </p>
            </div>
          </button>

          {!selectedApp && graph && (
            <div className="flex items-center gap-6 border-l border-slate-100 dark:border-gray-800 pl-8">
              <StatPill label="Total" value={stats.total} cls="text-slate-600 dark:text-gray-300" />
              <StatPill label="Healthy" value={stats.healthy} cls="text-green-600 dark:text-green-400" />
              <StatPill label="Unhealthy" value={stats.unhealthy} cls="text-red-600 dark:text-red-400" />
              <StatPill label="Progressing" value={stats.progressing} cls="text-blue-600 dark:text-blue-400" />
            </div>
          )}
        </div>

        {/* Toolbar Section in Header */}
        {!selectedApp && graph && (
          <div className="flex items-center gap-3 flex-1 justify-center max-w-2xl">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
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
            <div className="flex items-center gap-1 shrink-0">
              {(['all', 'Healthy', 'Unhealthy', 'Progressing'] as HealthFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setHealthFilter(f)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight transition-all ${
                    healthFilter === f
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 shrink-0">
          <ThemeToggle />

          <div className="h-6 w-[1px] bg-slate-200 dark:bg-gray-700 mx-1" />
          <div className="flex items-center gap-2">
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

      {/* ── Main content (below header, above ticker) ─────────────── */}
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
              <AppDetail
                app={selectedApp}
                graph={graph}
                onBack={() => setSelectedApp(null)}
              />
            ) : (
              <AppList 
                nodes={filteredApps} 
                onSelectApp={setSelectedApp}
              />
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

function StatPill({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className="flex flex-col items-start leading-none gap-1">
      <span className={`text-base font-black ${cls}`}>{value}</span>
      <span className="text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-tighter">{label}</span>
    </div>
  );
}

