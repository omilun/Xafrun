'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Activity, RefreshCcw } from 'lucide-react';
import FluxTree from '@/components/FluxTree';
import { FluxGraph } from '@/types';

type ConnStatus = 'connecting' | 'live' | 'error';

export default function Home() {
  const [graph, setGraph] = useState<FluxGraph | null>(null);
  const [status, setStatus] = useState<ConnStatus>('connecting');
  const [error, setError] = useState(false);

  const connect = useCallback(() => {
    setStatus('connecting');
    setError(false);

    // Fetch initial snapshot immediately.
    fetch('/api/tree')
      .then((r) => r.json())
      .then((data) => setGraph(data))
      .catch(() => {});

    const es = new EventSource('/api/events');

    es.addEventListener('graph', (e: MessageEvent) => {
      try {
        setGraph(JSON.parse(e.data));
        setStatus('live');
      } catch {
        // ignore malformed events
      }
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

  return (
    <main className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Fluxbaan</h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">GitOps Visualizer</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {error && (
            <button
              onClick={connect}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              Reconnect
            </button>
          )}
          <div className="h-8 w-[1px] bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              status === 'live' ? 'bg-green-500 animate-pulse' :
              status === 'error' ? 'bg-red-500' : 'bg-yellow-400 animate-pulse'
            }`} />
            <span className="text-xs font-semibold text-slate-600">
              {status === 'live' ? 'Live' : status === 'error' ? 'Disconnected' : 'Connecting...'}
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 relative">
        {status === 'connecting' && !graph ? (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-50/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader />
              <p className="text-sm font-medium text-slate-500">Connecting to Flux Controller...</p>
            </div>
          </div>
        ) : error && !graph ? (
          <div className="absolute inset-0 flex items-center justify-center z-20">
             <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-100 flex flex-col items-center gap-4 max-w-md text-center">
                <div className="bg-red-50 p-3 rounded-full text-red-500">
                  <RefreshCcw className="w-8 h-8" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Backend Connection Failed</h2>
                <p className="text-sm text-slate-500">Could not reach the Fluxbaan backend. Make sure the Go server is running.</p>
                <button
                  onClick={connect}
                  className="mt-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all shadow-md"
                >
                  Retry Connection
                </button>
             </div>
          </div>
        ) : (
          <FluxTree data={graph!} />
        )}
      </div>
    </main>
  );
}

const Loader = () => (
  <div className="relative w-12 h-12">
    <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
    <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin" />
  </div>
);

