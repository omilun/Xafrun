import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { CheckCircle2, XCircle, Loader2, HelpCircle, GitBranch, Box, Package } from 'lucide-react';
import { FluxNode, HealthStatus } from '../types';

const HealthIcon = ({ status }: { status: HealthStatus }) => {
  switch (status) {
    case 'Healthy':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'Unhealthy':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'Progressing':
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    default:
      return <HelpCircle className="w-4 h-4 text-gray-400" />;
  }
};

const TypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'Source':
      return <GitBranch className="w-4 h-4" />;
    case 'Kustomization':
      return <Box className="w-4 h-4" />;
    case 'HelmRelease':
      return <Package className="w-4 h-4" />;
    default:
      return <Box className="w-4 h-4" />;
  }
};

const ResourceNode = ({ data }: { data: FluxNode }) => {
  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 bg-white min-w-[200px] ${
      data.status === 'Healthy' ? 'border-green-100' : 
      data.status === 'Unhealthy' ? 'border-red-100' : 'border-blue-100'
    }`}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-gray-300" />
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gray-50 rounded">
            <TypeIcon type={data.type} />
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{data.kind}</span>
        </div>
        <HealthIcon status={data.status} />
      </div>

      <div className="flex flex-col">
        <span className="text-sm font-semibold text-gray-800 truncate">{data.name}</span>
        <span className="text-[10px] text-gray-500 font-mono">{data.namespace}</span>
      </div>

      {data.inventory && data.inventory.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-50">
          <span className="text-[9px] text-gray-400 uppercase font-bold tracking-tight">
            Inventory: {data.inventory.length} objects
          </span>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-gray-300" />
    </div>
  );
};

export default memo(ResourceNode);
