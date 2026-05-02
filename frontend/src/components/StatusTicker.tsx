'use client';

import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Activity, ShieldAlert, Globe, Cpu, Layers, HardDrive } from 'lucide-react';
import { FluxGraph, ClusterInfo } from '../types';

interface StatusTickerProps {
  graph: FluxGraph;
  clusterInfo?: ClusterInfo;
}

const StatusTicker = ({ graph, clusterInfo }: StatusTickerProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const unhealthyNodes = useMemo(() => {
    return graph.nodes.filter(n => n.status === 'Unhealthy');
  }, [graph.nodes]);

  const isHealthy = unhealthyNodes.length === 0;

  const tickerMessage = useMemo(() => {
    if (!isHealthy) {
      const first = unhealthyNodes[0];
      const errorMsg = first.message || "Unknown error";
      const truncated = errorMsg.length > 70 ? errorMsg.substring(0, 70) + "..." : errorMsg;
      return `${first.name} (${first.kind}) is unhealthy. The error is: ${truncated}`;
    }

    if (!clusterInfo) return "Cluster resources are healthy. Fetching system metadata...";

    return `Resources on ${clusterInfo.clusterName || 'cluster'} are healthy. Flux ${clusterInfo.fluxVersion || 'v2'}, K8s ${clusterInfo.k8sVersion}, OS: ${clusterInfo.osImage}, CNI: ${clusterInfo.cniVersion}, Ingress: ${clusterInfo.ingressController}`;
  }, [isHealthy, unhealthyNodes, clusterInfo]);

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start transition-all duration-300">
      {/* The main bar */}
      <div 
        className={`flex flex-col shadow-2xl rounded-xl overflow-hidden border transition-all duration-300 ${
          isExpanded ? 'w-[600px] h-auto p-4' : 'w-48 h-2 p-0 border-none'
        } ${
          isHealthy 
            ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200/50 dark:border-emerald-800/50' 
            : 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200/50 dark:border-rose-800/50'
        } backdrop-blur-md`}
      >
        {!isExpanded && (
          <div 
            className={`w-full h-full cursor-pointer hover:opacity-80 transition-opacity ${isHealthy ? 'bg-emerald-500' : 'bg-rose-500'}`}
            onClick={() => setIsExpanded(true)}
          />
        )}

        {isExpanded && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isHealthy ? (
                  <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                )}
                <span className={`text-xs font-bold uppercase tracking-widest ${isHealthy ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                  {isHealthy ? 'System Optimal' : 'Action Required'}
                </span>
              </div>
              <button 
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors"
              >
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="relative overflow-hidden h-6">
              <div className={`whitespace-nowrap flex items-center gap-4 ${isHealthy ? 'text-emerald-900 dark:text-emerald-100' : 'text-rose-900 dark:text-rose-100'} text-sm font-medium animate-marquee`}>
                {tickerMessage}
              </div>
            </div>

            {isHealthy && clusterInfo && (
              <div className="grid grid-cols-2 gap-y-2 mt-1 pt-3 border-t border-emerald-200/30 dark:border-emerald-800/30">
                <div className="flex items-center gap-2 text-[10px] text-emerald-800/70 dark:text-emerald-200/70">
                  <Globe className="w-3 h-3" /> {clusterInfo.k8sVersion}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-emerald-800/70 dark:text-emerald-200/70">
                  <Cpu className="w-3 h-3" /> {clusterInfo.osImage}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-emerald-800/70 dark:text-emerald-200/70">
                  <Layers className="w-3 h-3" /> {clusterInfo.cniVersion}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-emerald-800/70 dark:text-emerald-200/70">
                  <HardDrive className="w-3 h-3" /> Ingress: {clusterInfo.ingressController}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {!isExpanded && (
        <button 
          onClick={() => setIsExpanded(true)}
          className="mt-2 bg-white/80 dark:bg-gray-900/80 p-1.5 rounded-full shadow-lg border border-gray-200 dark:border-gray-800 hover:scale-110 transition-transform"
        >
          <ChevronUp className="w-4 h-4 text-gray-500" />
        </button>
      )}

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-5%); }
        }
        .animate-marquee {
          animation: marquee 10s linear infinite alternate;
        }
      `}</style>
    </div>
  );
};

export default StatusTicker;
