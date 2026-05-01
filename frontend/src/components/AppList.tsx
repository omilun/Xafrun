'use client';

import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, CheckCircle2, AlertCircle, Loader2, HelpCircle } from 'lucide-react';
import { FluxNode, APP_KINDS, HealthStatus } from '@/types';
import { AppCard } from './AppCard';

interface AppListProps {
  nodes: FluxNode[];
  onSelectApp: (node: FluxNode) => void;
}

type HealthFilter = 'all' | 'Healthy' | 'Unhealthy' | 'Progressing';

const FILTER_OPTIONS: { value: HealthFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'all',         label: 'All',        icon: <SlidersHorizontal className="w-3 h-3" /> },
  { value: 'Healthy',     label: 'Healthy',     icon: <CheckCircle2 className="w-3 h-3 text-green-500" /> },
  { value: 'Unhealthy',   label: 'Unhealthy',   icon: <AlertCircle className="w-3 h-3 text-red-500" /> },
  { value: 'Progressing', label: 'Progressing', icon: <Loader2 className="w-3 h-3 text-blue-400" /> },
];

export function AppList({ nodes, onSelectApp }: AppListProps) {
  const [search, setSearch] = useState('');
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');

  const apps = useMemo(
    () => nodes.filter((n) => APP_KINDS.has(n.kind)),
    [nodes]
  );

  const filtered = useMemo(() => {
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

  // Stats
  const stats = useMemo(() => ({
    total:       apps.length,
    healthy:     apps.filter((n) => n.status === 'Healthy').length,
    unhealthy:   apps.filter((n) => n.status === 'Unhealthy').length,
    progressing: apps.filter((n) => n.status === 'Progressing').length,
  }), [apps]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Stats bar */}
      <div className="flex items-center gap-6 px-6 py-3 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700 shrink-0">
        <StatPill label="Total" value={stats.total} cls="text-slate-600 dark:text-gray-300" />
        <StatPill label="Healthy" value={stats.healthy} cls="text-green-600 dark:text-green-400" />
        {stats.unhealthy > 0 && (
          <StatPill label="Unhealthy" value={stats.unhealthy} cls="text-red-600 dark:text-red-400" />
        )}
        {stats.progressing > 0 && (
          <StatPill label="Progressing" value={stats.progressing} cls="text-blue-600 dark:text-blue-400" />
        )}
      </div>

      {/* Search + filter toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 dark:bg-gray-950 border-b border-slate-200 dark:border-gray-700 shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search applications…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-gray-700
                       bg-white dark:bg-gray-900 text-slate-700 dark:text-gray-300
                       focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400"
          />
        </div>

        <div className="flex items-center gap-1">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setHealthFilter(opt.value)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                healthFilter === opt.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-900 text-slate-600 dark:text-gray-400 border border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-800'
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* App grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-slate-400 dark:text-gray-500">
            <HelpCircle className="w-12 h-12" />
            <p className="text-sm font-medium">No applications found</p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-xs text-indigo-500 hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((node) => (
              <AppCard key={node.id} node={node} onClick={() => onSelectApp(node)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatPill({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-lg font-bold ${cls}`}>{value}</span>
      <span className="text-xs text-slate-400 dark:text-gray-500">{label}</span>
    </div>
  );
}
