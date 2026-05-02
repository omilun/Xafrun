'use client';

import React, { useState, useEffect } from 'react';
import {
  X, RefreshCcw, PauseCircle, PlayCircle,
  AlertTriangle, CheckCircle2, Loader2, Clock,
} from 'lucide-react';
import { FluxNode, HealthStatus, InventoryItem, K8sEvent } from '@/types';
import { reconcile, suspend, resume, fetchYaml, fetchK8sEvents } from '@/lib/api';
import { useToast } from './Toast';

// DrawerNode accepts either a FluxNode OR a parsed InventoryItem
export type DrawerNode =
  | { kind: 'flux'; data: FluxNode }
  | { kind: 'inventory'; data: InventoryItem & { id: string } };

interface ResourceDrawerProps {
  node: DrawerNode | null;
  onClose: () => void;
}

const SUSPENDABLE_KINDS = new Set([
  'Kustomization', 'HelmRelease', 'GitRepository', 'OCIRepository', 'Bucket',
  'HelmRepository', 'HelmChart', 'ImageRepository', 'ImageUpdateAutomation',
]);

type TabId = 'overview' | 'yaml' | 'events';

function HealthBadge({ status }: { status: HealthStatus }) {
  const map: Record<HealthStatus, string> = {
    Healthy:     'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    Unhealthy:   'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    Progressing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    Unknown:     'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[status]}`}>
      {status}
    </span>
  );
}

// ─── YAML Tab ─────────────────────────────────────────────────────────────────
// Rendered with a key prop that changes on resource change → fresh state on each resource
function YamlTabInner({ kind, namespace, name }: { kind: string; namespace: string; name: string }) {
  const [yaml, setYaml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchYaml(kind, namespace, name)
      .then(setYaml)
      .catch((e: Error) => setError(e.message));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (yaml === null && error === null) return (
    <div className="flex items-center justify-center h-32">
      <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
    </div>
  );
  if (error) return (
    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs text-red-700 dark:text-red-400">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      {error}
    </div>
  );
  return (
    <pre className="text-[11px] font-mono leading-relaxed bg-slate-900 dark:bg-gray-950 text-slate-100
                    p-3 rounded-lg overflow-auto whitespace-pre-wrap break-all">
      {yaml}
    </pre>
  );
}

function YamlTab(props: { kind: string; namespace: string; name: string }) {
  return <YamlTabInner key={`${props.kind}/${props.namespace}/${props.name}`} {...props} />;
}

// ─── Events Tab ───────────────────────────────────────────────────────────────
function EventsTabInner({ kind, namespace, name }: { kind: string; namespace: string; name: string }) {
  const [events, setEvents] = useState<K8sEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchK8sEvents(kind, namespace, name)
      .then(setEvents)
      .catch((e: Error) => setError(e.message));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (events === null && error === null) return (
    <div className="flex items-center justify-center h-32">
      <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
    </div>
  );
  if (error) return (
    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs text-red-700 dark:text-red-400">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      {error}
    </div>
  );
  if (!events || events.length === 0) return (
    <div className="flex flex-col items-center gap-2 py-8 text-slate-400 dark:text-gray-500">
      <CheckCircle2 className="w-8 h-8" />
      <span className="text-sm">No events found</span>
    </div>
  );

  return (
    <div className="space-y-2">
      {events.map((ev, i) => (
        <div
          key={i}
          className={`rounded-lg p-3 text-xs border ${
            ev.type === 'Warning'
              ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
              : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={`font-bold ${ev.type === 'Warning' ? 'text-amber-700 dark:text-amber-400' : 'text-green-700 dark:text-green-400'}`}>
              {ev.reason}
            </span>
            <div className="flex items-center gap-1 text-slate-400 dark:text-gray-500 shrink-0">
              <Clock className="w-3 h-3" />
              <span className="text-[10px]">{ev.lastTimestamp ? new Date(ev.lastTimestamp).toLocaleString() : '—'}</span>
              {ev.count > 1 && (
                <span className="text-[10px] bg-slate-200 dark:bg-gray-700 rounded px-1">×{ev.count}</span>
              )}
            </div>
          </div>
          <p className="text-slate-600 dark:text-gray-300 leading-relaxed">{ev.message}</p>
        </div>
      ))}
    </div>
  );
}

function EventsTab(props: { kind: string; namespace: string; name: string }) {
  return <EventsTabInner key={`${props.kind}/${props.namespace}/${props.name}`} {...props} />;
}

// ─── Logs Tab ─────────────────────────────────────────────────────────────────
function LogsTabInner({ namespace, name }: { namespace: string; name: string }) {
  const [logs, setLogs] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const es = new EventSource(`/api/logs/${namespace}/${name}`);
    es.addEventListener('log', (e: MessageEvent) => {
      setLogs((prev) => [...prev.slice(-499), e.data]);
      setConnected(true);
    });
    es.onerror = () => {
      setConnected(false);
      es.close();
    };
    return () => es.close();
  }, [namespace, name]);

  const logRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 shrink-0">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          {connected ? 'Streaming Logs' : 'Disconnected'}
        </span>
        <button onClick={() => setLogs([])} className="text-[10px] text-slate-400 hover:text-white uppercase font-bold">Clear</button>
      </div>
      <div 
        ref={logRef}
        className="flex-1 overflow-auto p-3 text-[11px] font-mono leading-relaxed text-slate-300"
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-600 italic">Waiting for logs...</div>
        ) : (
          logs.map((l, i) => <div key={i} className="whitespace-pre-wrap mb-0.5">{l}</div>)
        )}
      </div>
    </div>
  );
}

function LogsTab(props: { namespace: string; name: string }) {
  return <LogsTabInner key={`${props.namespace}/${props.name}`} {...props} />;
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────
export function ResourceDrawer({ node, onClose }: ResourceDrawerProps) {
  const { showToast } = useToast();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isOpen = node !== null;

  // Derive kind/namespace/name regardless of node type
  const meta = node
    ? { kind: node.data.kind, namespace: node.data.namespace, name: node.data.name }
    : null;

  const nodeKey = meta ? `${meta.kind}/${meta.namespace}/${meta.name}` : '';

  const fluxNode = node?.kind === 'flux' ? node.data : null;
  const canSuspend = fluxNode ? SUSPENDABLE_KINDS.has(fluxNode.kind) : false;

  const handleAction = async (action: 'reconcile' | 'suspend' | 'resume') => {
    if (!fluxNode) return;
    setActionLoading(action);
    try {
      if (action === 'reconcile') await reconcile(fluxNode.kind, fluxNode.namespace, fluxNode.name);
      else if (action === 'suspend') await suspend(fluxNode.kind, fluxNode.namespace, fluxNode.name);
      else await resume(fluxNode.kind, fluxNode.namespace, fluxNode.name);
      showToast(`${action.charAt(0).toUpperCase() + action.slice(1)} triggered for ${fluxNode.name}`, 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : `${action} failed`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const tabs: { id: TabId | 'logs'; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'yaml', label: 'YAML' },
    { id: 'events', label: 'Events' },
  ];
  if (meta?.kind === 'Pod') {
    tabs.push({ id: 'logs', label: 'Logs' });
  }

  // Use a keyed inner component to reset tab state on resource change
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 backdrop-blur-[1px]"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed right-0 top-0 h-full w-[440px] bg-white dark:bg-gray-900 shadow-2xl z-50
                    transform transition-transform duration-300 ease-in-out flex flex-col
                    ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-gray-700 shrink-0">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-gray-500">
              {meta?.kind}
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-gray-100 mt-0.5 truncate">
              {meta?.name}
            </h2>
            <span className="text-xs text-slate-500 dark:text-gray-400 font-mono">{meta?.namespace}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors ml-2 shrink-0"
          >
            <X className="w-4 h-4 text-slate-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Tabs + Content — keyed by resource so tabs reset on navigation */}
        {meta && (
          <DrawerContent
            key={nodeKey}
            meta={meta}
            fluxNode={fluxNode}
            canSuspend={canSuspend}
            actionLoading={actionLoading}
            onAction={handleAction}
            tabs={tabs}
          />
        )}
      </div>
    </>
  );
}

interface DrawerContentProps {
  meta: { kind: string; namespace: string; name: string };
  fluxNode: FluxNode | null;
  canSuspend: boolean;
  actionLoading: string | null;
  onAction: (action: 'reconcile' | 'suspend' | 'resume') => void;
  tabs: { id: TabId | 'logs'; label: string }[];
}

function DrawerContent({ meta, fluxNode, canSuspend, actionLoading, onAction, tabs }: DrawerContentProps) {
  const [activeTab, setActiveTab] = useState<TabId | 'logs'>('overview');

  return (
    <>
      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-gray-700 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === tab.id
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {fluxNode && (
              <div className="flex items-center gap-3">
                <HealthBadge status={fluxNode.status} />
              </div>
            )}

            {fluxNode?.message && (
              <div className="bg-slate-50 dark:bg-gray-800 rounded-lg p-3 text-xs text-slate-600 dark:text-gray-300 font-mono leading-relaxed">
                {fluxNode.message}
              </div>
            )}

            <div className="space-y-2">
              {fluxNode?.sourceRef && <MetaRow label="Source Ref" value={fluxNode.sourceRef} />}
              {fluxNode?.revision && <MetaRow label="Revision" value={fluxNode.revision} />}
            </div>

            {fluxNode && (
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => onAction('reconcile')}
                  disabled={actionLoading !== null}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  <RefreshCcw className={`w-4 h-4 ${actionLoading === 'reconcile' ? 'animate-spin' : ''}`} />
                  Reconcile
                </button>

                {canSuspend && (
                  <>
                    <button
                      onClick={() => onAction('suspend')}
                      disabled={actionLoading !== null}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      <PauseCircle className={`w-4 h-4 ${actionLoading === 'suspend' ? 'animate-spin' : ''}`} />
                      Suspend
                    </button>
                    <button
                      onClick={() => onAction('resume')}
                      disabled={actionLoading !== null}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      <PlayCircle className={`w-4 h-4 ${actionLoading === 'resume' ? 'animate-spin' : ''}`} />
                      Resume
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'yaml' && (
          <YamlTab kind={meta.kind} namespace={meta.namespace} name={meta.name} />
        )}

        {activeTab === 'events' && (
          <EventsTab kind={meta.kind} namespace={meta.namespace} name={meta.name} />
        )}

        {activeTab === 'logs' && (
          <LogsTab namespace={meta.namespace} name={meta.name} />
        )}
      </div>
    </>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">{label}</span>
      <span className="text-xs font-mono text-slate-700 dark:text-gray-300 break-all">{value}</span>
    </div>
  );
}
