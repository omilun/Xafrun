'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search } from 'lucide-react';
import { FluxNode, HealthStatus } from '@/types';

interface CommandPaletteProps {
  nodes: FluxNode[];
  open: boolean;
  onClose: () => void;
  onSelect: (node: FluxNode) => void;
}

const statusDotClass: Record<HealthStatus, string> = {
  Healthy: 'bg-green-500',
  Unhealthy: 'bg-red-500',
  Progressing: 'bg-blue-400',
  Unknown: 'bg-gray-300',
};

export function CommandPalette({ nodes, open, onClose, onSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? nodes.filter((n) => {
        const q = query.toLowerCase();
        return (
          n.name.toLowerCase().includes(q) ||
          n.namespace.toLowerCase().includes(q) ||
          n.kind.toLowerCase().includes(q)
        );
      })
    : nodes.slice(0, 20);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      const node = filtered[activeIdx];
      if (node) { onSelect(node); onClose(); }
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [filtered, activeIdx, onSelect, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-24 px-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-slate-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-gray-700">
          <Search className="w-4 h-4 text-slate-400 dark:text-gray-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search by name, namespace, or kind…"
            className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-500"
          />
          <kbd className="text-[10px] font-medium text-slate-400 dark:text-gray-600 bg-slate-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-gray-400 text-center py-8">No resources found</p>
          ) : (
            filtered.map((node, idx) => (
              <button
                key={node.id}
                onClick={() => { onSelect(node); onClose(); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                  ${idx === activeIdx
                    ? 'bg-indigo-50 dark:bg-indigo-900/30'
                    : 'hover:bg-slate-50 dark:hover:bg-gray-800'
                  }`}
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${statusDotClass[node.status]}`} />
                <span className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wide w-24 shrink-0 truncate">
                  {node.kind}
                </span>
                <span className="text-sm text-slate-800 dark:text-gray-200 truncate flex-1">{node.name}</span>
                <span className="text-xs text-slate-400 dark:text-gray-500 font-mono shrink-0">{node.namespace}</span>
              </button>
            ))
          )}
        </div>

        {filtered.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-100 dark:border-gray-700 flex gap-3 text-[10px] text-slate-400 dark:text-gray-600">
            <span>↑↓ navigate</span>
            <span>↵ select</span>
            <span>ESC close</span>
          </div>
        )}
      </div>
    </div>
  );
}
