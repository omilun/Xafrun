'use client';

import React, { useState } from 'react';
import { X, RefreshCcw, PauseCircle, PlayCircle, FileCode } from 'lucide-react';
import { FluxNode, HealthStatus } from '@/types';
import { reconcile, suspend, resume } from '@/lib/api';
import { useToast } from './Toast';

interface NodeDrawerProps {
  node: FluxNode | null;
  onClose: () => void;
}

const SUSPENDABLE_KINDS = new Set([
  'Kustomization', 'HelmRelease', 'GitRepository', 'OCIRepository', 'Bucket',
  'HelmRepository', 'HelmChart', 'ImageRepository', 'ImageUpdateAutomation',
]);

function StatusBadge({ status }: { status: HealthStatus }) {
  const map: Record<HealthStatus, string> = {
    Healthy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    Unhealthy: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    Progressing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    Unknown: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[status]}`}>
      {status}
    </span>
  );
}

export function NodeDrawer({ node, onClose }: NodeDrawerProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const isOpen = node !== null;

  const handleAction = async (action: 'reconcile' | 'suspend' | 'resume') => {
    if (!node) return;
    setLoading(action);
    try {
      if (action === 'reconcile') await reconcile(node.kind, node.namespace, node.name);
      else if (action === 'suspend') await suspend(node.kind, node.namespace, node.name);
      else await resume(node.kind, node.namespace, node.name);
      showToast(`${action.charAt(0).toUpperCase() + action.slice(1)} triggered for ${node.name}`, 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : `${action} failed`, 'error');
    } finally {
      setLoading(null);
    }
  };

  const canSuspend = node ? SUSPENDABLE_KINDS.has(node.kind) : false;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 backdrop-blur-[1px]"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-900 shadow-2xl z-50
                    transform transition-transform duration-300 ease-in-out flex flex-col
                    ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-gray-700 shrink-0">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-gray-500">
              {node?.kind}
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-gray-100 mt-0.5">
              {node?.name}
            </h2>
            <span className="text-xs text-slate-500 dark:text-gray-400 font-mono">{node?.namespace}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4 text-slate-500 dark:text-gray-400" />
          </button>
        </div>

        {node && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            <div className="flex items-center gap-3">
              <StatusBadge status={node.status} />
            </div>

            {node.message && (
              <div className="bg-slate-50 dark:bg-gray-800 rounded-lg p-3 text-xs text-slate-600 dark:text-gray-300 font-mono leading-relaxed">
                {node.message}
              </div>
            )}

            <div className="space-y-2">
              {node.sourceRef && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">Source Ref</span>
                  <span className="text-xs font-mono text-slate-700 dark:text-gray-300">{node.sourceRef}</span>
                </div>
              )}
              {node.revision && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">Revision</span>
                  <span className="text-xs font-mono text-slate-700 dark:text-gray-300">{node.revision}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => handleAction('reconcile')}
                disabled={loading !== null}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                <RefreshCcw className={`w-4 h-4 ${loading === 'reconcile' ? 'animate-spin' : ''}`} />
                Reconcile
              </button>

              {canSuspend && (
                <>
                  <button
                    onClick={() => handleAction('suspend')}
                    disabled={loading !== null}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    <PauseCircle className={`w-4 h-4 ${loading === 'suspend' ? 'animate-spin' : ''}`} />
                    Suspend
                  </button>
                  <button
                    onClick={() => handleAction('resume')}
                    disabled={loading !== null}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    <PlayCircle className={`w-4 h-4 ${loading === 'resume' ? 'animate-spin' : ''}`} />
                    Resume
                  </button>
                </>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-gray-700">
              <button
                onClick={() => showToast('YAML inspection coming in next release', 'error')}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
              >
                <FileCode className="w-4 h-4" />
                View YAML
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
