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

const FLUX_NODE_WIDTH  = 240;
const FLUX_NODE_HEIGHT = 80;
const K8S_NODE_WIDTH   = 200;
const K8S_NODE_HEIGHT  = 56;

/**
 * Main graph layout: LR (left-to-right) for the Flux resource overview.
 * Only contains Flux nodes (Sources, Kustomizations, HelmReleases, etc.)
 * No inventory items.
 */
function layoutMainGraph(data: FluxGraph): { nodes: Node[]; edges: Edge[] } {
  const g = new Dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', ranksep: 180, nodesep: 80, marginx: 80, marginy: 80 });

  data.nodes.forEach((n) => g.setNode(n.id, { width: FLUX_NODE_WIDTH, height: FLUX_NODE_HEIGHT }));
  data.edges.forEach((e) => g.setEdge(e.source, e.target));
  Dagre.layout(g);

  const fluxNodes: Node[] = data.nodes.map((n) => {
    const { x, y } = g.node(n.id);
    return {
      id: n.id,
      type: 'fluxNode',
      data: { ...n, _layout: 'lr' },
      position: { x: x - FLUX_NODE_WIDTH / 2, y: y - FLUX_NODE_HEIGHT / 2 },
    };
  });

  const fluxEdges: Edge[] = data.edges.map((e) => ({
    ...e,
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#94a3b8', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
  }));

  return { nodes: fluxNodes, edges: fluxEdges };
}

/**
 * Detail graph layout: TB (top-to-bottom) for the app detail view.
 * Merges Flux nodes + all inventory K8s items into a single Dagre graph
 * so edges fan out naturally across the full width instead of from one point.
 */
function layoutDetailGraph(data: FluxGraph, appNode: FluxNode): { nodes: Node[]; edges: Edge[] } {
  const inventoryItems = (appNode.inventory ?? []).map(parseInventoryId);

  const g = new Dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', ranksep: 100, nodesep: 24, marginx: 60, marginy: 60 });

  // Add all Flux nodes (source + app node)
  data.nodes.forEach((n) => g.setNode(n.id, { width: FLUX_NODE_WIDTH, height: FLUX_NODE_HEIGHT }));
  data.edges.forEach((e) => g.setEdge(e.source, e.target));

  // Add all inventory nodes
  inventoryItems.forEach((_, i) => g.setNode(`inv-${i}`, { width: K8S_NODE_WIDTH, height: K8S_NODE_HEIGHT }));

  // Connect app node → each inventory item
  inventoryItems.forEach((_, i) => g.setEdge(appNode.id, `inv-${i}`));

  Dagre.layout(g);

  const fluxNodes: Node[] = data.nodes.map((n) => {
    const { x, y } = g.node(n.id);
    return {
      id: n.id,
      type: 'fluxNode',
      data: { ...n, _layout: 'tb' },
      position: { x: x - FLUX_NODE_WIDTH / 2, y: y - FLUX_NODE_HEIGHT / 2 },
    };
  });

  const invNodes: Node[] = inventoryItems.map((item, i) => {
    const { x, y } = g.node(`inv-${i}`);
    return {
      id: `inv-${i}`,
      type: 'k8sNode',
      data: item,
      position: { x: x - K8S_NODE_WIDTH / 2, y: y - K8S_NODE_HEIGHT / 2 },
    };
  });

  const fluxEdges: Edge[] = data.edges.map((e) => ({
    ...e,
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#94a3b8', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
  }));

  const invEdges: Edge[] = inventoryItems.map((_, i) => ({
    id: `inv-edge-${i}`,
    source: appNode.id,
    target: `inv-${i}`,
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#cbd5e1', strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#cbd5e1', width: 12, height: 12 },
  }));

  return { nodes: [...fluxNodes, ...invNodes], edges: [...fluxEdges, ...invEdges] };
}

interface FluxTreeProps {
  data: FluxGraph;
  onNodeClick?: (node: DrawerNode) => void;
  rfInstanceRef?: React.MutableRefObject<ReactFlowInstance | null>;
  /** When set, inventory nodes are shown for this app using TB layout */
  focusedApp?: FluxNode;
}

const FluxTree = ({ data, onNodeClick, rfInstanceRef, focusedApp }: FluxTreeProps) => {
  const { nodes, edges } = useMemo(
    () => focusedApp ? layoutDetailGraph(data, focusedApp) : layoutMainGraph(data),
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
