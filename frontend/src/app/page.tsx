'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Activity, RefreshCcw, Search } from 'lucide-react';
import type { ReactFlowInstance } from 'reactflow';
import FluxTree from '@/components/FluxTree';
import { Sidebar } from '@/components/Sidebar';
import { NewsTicker } from '@/components/NewsTicker';
import { NodeDrawer } from '@/components/NodeDrawer';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CommandPalette } from '@/components/CommandPalette';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { filterGraph } from '@/lib/filterGraph';
import { FluxGraph, FluxNode, ClusterInfo } from '@/types';

type ConnStatus = 'connecting' | 'live' | 'error';

export default function Home() {
  const [graph, setGraph]         = useState<FluxGraph | null>(null);
  const [status, setStatus]       = useState<ConnStatus>('connecting');
  const [error, setError]         = useState(false);
  const [selectedNs, setSelectedNs] = useState<string | null>(null);
  const [info, setInfo]           = useState<ClusterInfo | null>(null);
  const [selectedNode, setSelectedNode] = useState<FluxNode | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);

  useEffect(() => {
    fetch('/api/info')
      .then((r) => r.json())
      .then((d) => setInfo(d))
      .catch(() => {});
  }, []);

  const connect = useCallback(() => {
    setStatus('connecting');
    setError(false);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  // Cmd-K / Ctrl-K opens command palette
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

  const filteredGraph = useMemo(
    () => (graph ? filterGraph(graph, selectedNs) : null),
    [graph, selectedNs]
  );

  const handleSelectFromPalette = useCallback((node: FluxNode) => {
    setSelectedNode(node);
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
      <header className="h-16 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700 px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-gray-100 tracking-tight">Fluxbaan</h1>
            <p className="text-[10px] text-slate-500 dark:text-gray-400 font-medium uppercase tracking-widest">GitOps Visualizer</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-800 dark:hover:text-indigo-300 rounded-md border border-slate-200 dark:border-gray-700 transition-colors"
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

          <div className="h-8 w-[1px] bg-slate-200 dark:bg-gray-700" />
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              status === 'live'  ? 'bg-green-500 animate-pulse' :
              status === 'error' ? 'bg-red-500' : 'bg-yellow-400 animate-pulse'
            }`} />
            <span className="text-xs font-semibold text-slate-600 dark:text-gray-300">
              {status === 'live' ? 'Live' : status === 'error' ? 'Disconnected' : 'Connecting...'}
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden pb-9">
        {graph && (
          <Sidebar
            nodes={graph.nodes}
            selected={selectedNs}
            onSelect={setSelectedNs}
          />
        )}

        <div className="flex-1 relative overflow-hidden">
          {status === 'connecting' && !filteredGraph ? (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-50/50 dark:bg-gray-950/50 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <Loader />
                <p className="text-sm font-medium text-slate-500 dark:text-gray-400">Connecting to Flux Controller...</p>
              </div>
            </div>
          ) : error && !filteredGraph ? (
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl border border-red-100 dark:border-red-900 flex flex-col items-center gap-4 max-w-md text-center">
                <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-full text-red-500">
                  <RefreshCcw className="w-8 h-8" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-gray-100">Backend Connection Failed</h2>
                <p className="text-sm text-slate-500 dark:text-gray-400">Could not reach the Fluxbaan backend.</p>
                <button
                  onClick={connect}
                  className="mt-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all shadow-md"
                >
                  Retry Connection
                </button>
              </div>
            </div>
          ) : filteredGraph ? (
            <ErrorBoundary>
              <FluxTree
                data={filteredGraph}
                onNodeClick={(n) => setSelectedNode(n)}
                rfInstanceRef={rfInstanceRef}
              />
            </ErrorBoundary>
          ) : null}
        </div>
      </div>

      {graph && <NewsTicker nodes={graph.nodes} info={info} />}

      <NodeDrawer node={selectedNode} onClose={() => setSelectedNode(null)} />
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
