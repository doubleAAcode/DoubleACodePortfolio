import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  applyNodeChanges,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  CircleStop,
  GitBranch,
  Image,
  ListTree,
  MessageSquare,
  ShoppingCart,
  UserRoundCheck,
  Zap,
} from "lucide-react";
import { useMemo } from "react";

import {
  connectVisualNodes,
  getEffectiveVisualEdges,
  type VisualFlowBlockType,
  type VisualFlowDefinition,
} from "@/features/connect/shared/visual-flow-builder";
import type { FlowValidationResult } from "@/features/connect/shared/flow-template-types";

type FlowCanvasNodeData = {
  title: string;
  type: VisualFlowBlockType;
  issueCount: number;
  selected: boolean;
};

type FlowCanvasNode = Node<FlowCanvasNodeData, "flowStep">;

const nodeTypes = { flowStep: FlowStepNode };

export function CanonicalFlowCanvas({
  flow,
  validation,
  selectedNodeId,
  onChange,
  onSelectNode,
}: {
  flow: VisualFlowDefinition;
  validation: FlowValidationResult;
  selectedNodeId: string;
  onChange: (flow: VisualFlowDefinition) => void;
  onSelectNode: (nodeId: string) => void;
}) {
  const nodes = useMemo<FlowCanvasNode[]>(
    () =>
      flow.nodes.map((node) => ({
        id: node.id,
        type: "flowStep",
        position: node.position,
        data: {
          title: node.title,
          type: node.type,
          issueCount: validation.issues.filter((issue) => issue.nodeId === node.id).length,
          selected: selectedNodeId === node.id,
        },
      })),
    [flow.nodes, selectedNodeId, validation.issues],
  );

  const edges = useMemo<Edge[]>(
    () =>
      getEffectiveVisualEdges(flow).map((edge) => ({
        id: edge.id,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        label: edge.label,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 1.5 },
      })),
    [flow],
  );

  function handleNodeChanges(changes: NodeChange<FlowCanvasNode>[]) {
    const nextNodes = applyNodeChanges(changes, nodes);
    const positionById = new Map(nextNodes.map((node) => [node.id, node.position]));
    onChange({
      ...flow,
      nodes: flow.nodes.map((node) => ({
        ...node,
        position: positionById.get(node.id) ?? node.position,
      })),
    });
  }

  function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target) return;
    onChange(connectVisualNodes(flow, connection.source, connection.target));
  }

  return (
    <div className="h-[560px] overflow-hidden rounded-lg border bg-muted/10">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodeChanges}
        onConnect={handleConnect}
        onNodeClick={(_, node) => onSelectNode(node.id)}
        fitView
        minZoom={0.2}
        maxZoom={1.7}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={18} size={1} />
        <Controls />
        <MiniMap pannable zoomable nodeStrokeWidth={2} />
      </ReactFlow>
    </div>
  );
}

function FlowStepNode({ data }: NodeProps<FlowCanvasNode>) {
  const Icon = iconForType(data.type);
  return (
    <div
      className={`min-w-48 rounded-md border-2 bg-card px-3 py-2 shadow-sm ${
        data.selected ? "border-primary ring-2 ring-primary/15" : toneForType(data.type)
      }`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        <Icon className="size-3.5" />
        <span className="text-[10px] uppercase text-muted-foreground">
          {friendlyType(data.type)}
        </span>
        {data.issueCount ? (
          <span className="ml-auto rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] text-destructive">
            {data.issueCount}
          </span>
        ) : null}
      </div>
      <div className="mt-1 max-w-52 truncate text-sm font-medium">{data.title}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function iconForType(type: VisualFlowBlockType) {
  if (type === "START") return Zap;
  if (type === "SEND_IMAGE") return Image;
  if (type === "MAIN_MENU" || type === "LANGUAGE_SELECTION") return ListTree;
  if (type === "QUESTION" || type === "CONDITION") return GitBranch;
  if (type === "HUMAN_HANDOFF") return UserRoundCheck;
  if (type === "END") return CircleStop;
  if (
    type.includes("PRODUCT") ||
    type.includes("CART") ||
    type.includes("CHECKOUT") ||
    type.includes("ORDER")
  ) {
    return ShoppingCart;
  }
  return MessageSquare;
}

function toneForType(type: VisualFlowBlockType) {
  if (type === "START") return "border-orange-400";
  if (type === "QUESTION" || type === "CONDITION") return "border-amber-400";
  if (type === "HUMAN_HANDOFF") return "border-sky-400";
  if (type === "END") return "border-slate-400";
  if (type.includes("PRODUCT") || type.includes("CART") || type.includes("CHECKOUT")) {
    return "border-violet-400";
  }
  return "border-emerald-400";
}

function friendlyType(type: VisualFlowBlockType) {
  return type.toLowerCase().replaceAll("_", " ");
}
