'use client';

import React from 'react';
import { HelpCircle } from 'lucide-react';
import { FluxNode } from '@/types';
import { AppCard } from './AppCard';

interface AppListProps {
  nodes: FluxNode[];
  onSelectApp: (node: FluxNode) => void;
}

export function AppList({ nodes, onSelectApp }: AppListProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* App grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-32 text-slate-400 dark:text-gray-500">
            <HelpCircle className="w-12 h-12" />
            <p className="text-sm font-medium">No applications found matching your criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {nodes.map((node) => (
              <AppCard key={node.id} node={node} onClick={() => onSelectApp(node)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
