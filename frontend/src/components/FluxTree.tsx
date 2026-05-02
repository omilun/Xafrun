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

import ResourceNode, { K8sInventoryNode } from './ResourceNode';
import { FluxGraph, FluxNode, InventoryItem } from '../types';
import { parseInventoryId } from '@/lib/filterGraph';
import { DrawerNode } from './ResourceDrawer';

const nodeTypes = {
  fluxNode:      ResourceNode,
  k8sNode:       K8sInventoryNode,
};

const FLUX_NODE_WIDTH  = 260;
const FLUX_NODE_HEIGHT = 80;
const K8S_NODE_WIDTH   = 200;
const K8S_NODE_HEIGHT  = 52;

function buildInventoryNodes(appNode: FluxNode): { nodes: Node[]; edges: Edge[] } {
  const inventoryItems = (appNode.inventory ?? []).map(parseInventoryId);
  if (inventoryItems.length === 0) return { nodes: [], edges: [] };

  const g = new Dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', ranksep: 80, nodesep: 30, marginx: 40, marginy: 40 });

  inventoryItems.forEach((item, i) => {
    g.setNode(`inv-${i}`, { width: K8S_NODE_WIDTH, height: K8S_NODE_HEIGHT });
  });

  Dagre.layout(g);

  const nodes: Node[] = inventoryItems.map((item, i) => {
    const { x, y } = g.node(`inv-${i}`);
    return {
      id: `inv-${i}`,
      type: 'k8sNode',
      data: item,
      position: { x: x - K8S_NODE_WIDTH / 2, y: y - K8S_NODE_HEIGHT / 2 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
  });

  // Connect app node to each inventory item
  const edges: Edge[] = inventoryItems.map((_, i) => ({
    id: `inv-edge-${i}`,
    source: appNode.id,
    target: `inv-${i}`,
    animated: false,
    style: { stroke: '#cbd5e1', strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#cbd5e1' },
  }));

  return { nodes, edges };
}

function layoutWithDagre(data: FluxGraph, appNode?: FluxNode): { nodes: Node[]; edges: Edge[] } {
  const g = new Dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'LR',
    ranksep: 200,
    nodesep: 100,
    marginx: 100,
    marginy: 100,
  });

  data.nodes.forEach((n) => {
    g.setNode(n.id, { width: FLUX_NODE_WIDTH, height: FLUX_NODE_HEIGHT });
  });
  data.edges.forEach((e) => {
    g.setEdge(e.source, e.target);
  });

  Dagre.layout(g);

  let fluxNodes: Node[] = data.nodes.map((n) => {
    const { x, y } = g.node(n.id);
    return {
      id: n.id,
      type: 'fluxNode',
      data: n,
      position: { x: x - FLUX_NODE_WIDTH / 2, y: y - FLUX_NODE_HEIGHT / 2 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
  });

  const fluxEdges: Edge[] = data.edges.map((e) => ({
    ...e,
    animated: true,
    style: { stroke: '#94a3b8', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
  }));

  // If in detail mode, append inventory nodes to the right of the app node
  if (appNode && appNode.inventory && appNode.inventory.length > 0) {
    const appRfNode = fluxNodes.find((n) => n.id === appNode.id);
    const appY = appRfNode ? appRfNode.position.y : 0;
    const appX = appRfNode ? appRfNode.position.x : 0;

    const { nodes: invNodes, edges: invEdges } = buildInventoryNodes(appNode);

    // Offset inventory nodes to the right of the app node
    const invOffsetX = appX + FLUX_NODE_WIDTH + 150;
    
    // Centre them vertically around the app node
    const totalInvHeight = invNodes.reduce((sum) => sum + K8S_NODE_HEIGHT + 20, 0);
    const invStartY = appY + FLUX_NODE_HEIGHT / 2 - totalInvHeight / 2;

    const offsetInvNodes = invNodes.map((n, idx) => ({
      ...n,
      position: {
        x: invOffsetX,
        y: invStartY + idx * (K8S_NODE_HEIGHT + 20),
      },
    }));

    fluxNodes = [...fluxNodes, ...offsetInvNodes];
    return { nodes: fluxNodes, edges: [...fluxEdges, ...invEdges] };
  }

  return { nodes: fluxNodes, edges: fluxEdges };
}

interface FluxTreeProps {
  data: FluxGraph;
  onNodeClick?: (node: DrawerNode) => void;
  rfInstanceRef?: React.MutableRefObject<ReactFlowInstance | null>;
  /** When set, inventory nodes are shown for this app */
  focusedApp?: FluxNode;
}

const FluxTree = ({ data, onNodeClick, rfInstanceRef, focusedApp }: FluxTreeProps) => {
  const { nodes, edges } = useMemo(
    () => layoutWithDagre(data, focusedApp),
    [data, focusedApp]
  );
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  // Use node length as a dependency to only fitView when structure changes,
  // preventing constant snapping back to fitView during simple status updates.
  const nodesLength = nodes.length;
  useEffect(() => {
    if (!rfInstance) return;
    const id = setTimeout(() => {
      rfInstance.fitView({ padding: 0.2, duration: 400 });
    }, 60);
    return () => clearTimeout(id);
  }, [rfInstance, nodesLength]);

  const handleInit = (instance: ReactFlowInstance) => {
    setRfInstance(instance);
    if (rfInstanceRef) rfInstanceRef.current = instance;
  };

  const handleNodeClick = (_e: React.MouseEvent, rfNode: Node) => {
    if (!onNodeClick) return;
    if (rfNode.type === 'k8sNode') {
      const item = rfNode.data as InventoryItem;
      onNodeClick({ kind: 'inventory', data: { ...item, id: rfNode.id } });
    } else {
      onNodeClick({ kind: 'flux', data: rfNode.data as FluxNode });
    }
  };

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-gray-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.05}
        maxZoom={1.5}
        onInit={handleInit}
        onNodeClick={handleNodeClick}
      >
        <Background color="#cbd5e1" gap={20} />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === 'k8sNode') return '#94a3b8';
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
