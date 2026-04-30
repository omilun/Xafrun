'use client';

import React, { useMemo } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap,
  Node,
  Edge,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';

import ResourceNode from './ResourceNode';
import { FluxGraph } from '../types';

const nodeTypes = {
  fluxNode: ResourceNode,
};

interface FluxTreeProps {
  data: FluxGraph;
}

const FluxTree = ({ data }: FluxTreeProps) => {
  const { nodes, edges } = useMemo(() => {
    // Simple layout logic: increment Y for each level, X for each sibling
    const layoutNodes: Node[] = data.nodes.map((n, i) => {
      // Calculate level based on connections (Source=0, Kustomize=1, etc)
      let level = 1;
      if (n.type === 'Source') level = 0;
      if (n.type === 'K8sResource') level = 2;

      return {
        id: n.id,
        type: 'fluxNode',
        data: n,
        position: { x: (i % 3) * 300, y: level * 200 },
      };
    });

    const layoutEdges: Edge[] = data.edges.map((e) => ({
      ...e,
      animated: true,
      style: { stroke: '#94a3b8', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#94a3b8',
      },
    }));

    return { nodes: layoutNodes, edges: layoutEdges };
  }, [data]);

  return (
    <div className="w-full h-full bg-slate-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="#cbd5e1" gap={20} />
        <Controls />
        <MiniMap 
          nodeColor={(n) => {
            const data = n.data as any;
            if (data?.status === 'Healthy') return '#22c55e';
            if (data?.status === 'Unhealthy') return '#ef4444';
            return '#3b82f6';
          }}
          maskColor="rgba(248, 250, 252, 0.7)"
        />
      </ReactFlow>
    </div>
  );
};

export default FluxTree;
