'use client';

import React, { useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import Dagre from '@dagrejs/dagre';

import ResourceNode from './ResourceNode';
import { FluxGraph } from '../types';

const nodeTypes = {
  fluxNode: ResourceNode,
};

// Node dimensions — must match the card size in ResourceNode.tsx
const NODE_WIDTH = 280;
const NODE_HEIGHT = 110;

function layoutWithDagre(data: FluxGraph): { nodes: Node[]; edges: Edge[] } {
  const g = new Dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'TB',   // top → bottom
    ranksep: 80,     // vertical gap between ranks
    nodesep: 40,     // horizontal gap between nodes in same rank
    marginx: 40,
    marginy: 40,
  });

  // Register nodes
  data.nodes.forEach((n) => {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  // Register edges
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
      // Dagre gives centre position; ReactFlow wants top-left
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
}

const FluxTree = ({ data }: FluxTreeProps) => {
  const { nodes, edges } = useMemo(() => layoutWithDagre(data), [data]);

  return (
    <div className="w-full h-full bg-slate-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
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

