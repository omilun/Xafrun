'use client';

import React, { useMemo, useEffect, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType,
  Position,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import Dagre from '@dagrejs/dagre';

import ResourceNode from './ResourceNode';
import { FluxGraph, FluxNode } from '../types';

const nodeTypes = {
  fluxNode: ResourceNode,
};

const NODE_WIDTH  = 260;
const NODE_HEIGHT = 80;

function layoutWithDagre(data: FluxGraph): { nodes: Node[]; edges: Edge[] } {
  const g = new Dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'TB',
    ranksep: 220,
    nodesep: 100,
    marginx: 80,
    marginy: 80,
  });

  data.nodes.forEach((n) => {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });
  data.edges.forEach((e) => {
    g.setEdge(e.source, e.target);
  });

  Dagre.layout(g);

  const nodes: Node[] = data.nodes.map((n) => {
    const { x, y } = g.node(n.id);
    return {
      id: n.id,
      type: 'fluxNode',
      data: n,
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    };
  });

  const edges: Edge[] = data.edges.map((e) => ({
    ...e,
    animated: true,
    style: { stroke: '#94a3b8', strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#94a3b8',
    },
  }));

  return { nodes, edges };
}

interface FluxTreeProps {
  data: FluxGraph;
  onNodeClick?: (node: FluxNode) => void;
  rfInstanceRef?: React.MutableRefObject<ReactFlowInstance | null>;
}

const FluxTree = ({ data, onNodeClick, rfInstanceRef }: FluxTreeProps) => {
  const { nodes, edges } = useMemo(() => layoutWithDagre(data), [data]);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  useEffect(() => {
    if (!rfInstance) return;
    const id = setTimeout(() => {
      rfInstance.fitView({ padding: 0.3, duration: 400 });
    }, 60);
    return () => clearTimeout(id);
  }, [nodes, rfInstance]);

  const handleInit = (instance: ReactFlowInstance) => {
    setRfInstance(instance);
    if (rfInstanceRef) rfInstanceRef.current = instance;
  };

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-gray-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.05}
        maxZoom={1.5}
        onInit={handleInit}
        onNodeClick={(_e, node) => onNodeClick?.(node.data as FluxNode)}
      >
        <Background color="#cbd5e1" gap={20} />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            const d = n.data as { status?: string };
            if (d?.status === 'Healthy') return '#22c55e';
            if (d?.status === 'Unhealthy') return '#ef4444';
            return '#3b82f6';
          }}
          maskColor="rgba(248, 250, 252, 0.7)"
        />
      </ReactFlow>
    </div>
  );
};

export default FluxTree;
