'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Activity, RefreshCcw, Search } from 'lucide-react';
import type { ReactFlowInstance } from 'reactflow';
import { AppList } from '@/components/AppList';
import { AppDetail } from '@/components/AppDetail';
import { NewsTicker } from '@/components/NewsTicker';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CommandPalette } from '@/components/CommandPalette';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { FluxGraph, FluxNode, ClusterInfo } from '@/types';

type ConnStatus = 'connecting' | 'live' | 'error';

export default function Home() {
  const [graph, setGraph]         = useState<FluxGraph | null>(null);
  const [status, setStatus]       = useState<ConnStatus>('connecting');
  const [error, setError]         = useState(false);
  const [info, setInfo]           = useState<ClusterInfo | null>(null);
  const [selectedApp, setSelectedApp] = useState<FluxNode | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);

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
      <header className="h-14 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700
                         px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
        <button
          onClick={() => setSelectedApp(null)}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <span className="text-base font-bold text-slate-900 dark:text-gray-100 tracking-tight">Xafrun</span>
            <p className="text-[9px] text-slate-400 dark:text-gray-500 font-medium uppercase tracking-widest leading-none">
              GitOps Dashboard
            </p>
          </div>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-gray-400
                       hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-800 dark:hover:text-indigo-300
                       rounded-md border border-slate-200 dark:border-gray-700 transition-colors"
            title="Search resources (⌘K)"
          >
            <Search className="w-3.5 h-3.5" />
            Search
            <kbd className="text-[10px] font-medium text-slate-400 dark:text-gray-600 bg-slate-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">⌘K</kbd>
          </button>

          {error && (
            <button
              onClick={connect}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-800 rounded-md transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              Reconnect
            </button>
          )}

          <ThemeToggle />

          <div className="h-6 w-[1px] bg-slate-200 dark:bg-gray-700" />
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
              <AppList nodes={graph.nodes} onSelectApp={setSelectedApp} />
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
