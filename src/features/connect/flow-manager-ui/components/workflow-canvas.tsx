import { useCallback } from "react";
import ReactFlow, {
  Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge,
  type Node, type Edge, type Connection,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { Zap, Filter, MessageSquare, UserPlus, Tag, Clock, Webhook, Sparkles, Bell } from "lucide-react";

const iconMap = {
  trigger: Zap,
  condition: Filter,
  message: MessageSquare,
  assign: UserPlus,
  tag: Tag,
  wait: Clock,
  webhook: Webhook,
  ai: Sparkles,
  notify: Bell,
} as const;

function NodeCard({ data }: { data: { label: string; kind: keyof typeof iconMap; sub?: string } }) {
  const Icon = iconMap[data.kind] ?? MessageSquare;
  const toneMap: Record<string, string> = {
    trigger: "border-orange-400 bg-orange-50 dark:bg-orange-950/20",
    condition: "border-amber-400 bg-amber-50 dark:bg-amber-950/20",
    message: "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20",
    assign: "border-sky-400 bg-sky-50 dark:bg-sky-950/20",
    tag: "border-violet-400 bg-violet-50 dark:bg-violet-950/20",
    wait: "border-slate-400 bg-slate-50 dark:bg-slate-950/20",
    webhook: "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/20",
    ai: "border-primary bg-primary/5",
    notify: "border-rose-400 bg-rose-50 dark:bg-rose-950/20",
  };
  return (
    <div className={`rounded-md border-2 ${toneMap[data.kind]} px-3 py-2 shadow-sm min-w-[180px]`}>
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        <Icon className="h-3.5 w-3.5" />
        <span className="uppercase tracking-wide text-[10px] opacity-70">{data.kind}</span>
      </div>
      <div className="mt-0.5 text-sm font-medium">{data.label}</div>
      {data.sub && <div className="text-[11px] text-muted-foreground">{data.sub}</div>}
    </div>
  );
}
const nodeTypes = { card: NodeCard };

const initialNodes: Node[] = [
  { id: "n1", type: "card", position: { x: 40, y: 40 }, data: { label: "Cart abandoned", kind: "trigger", sub: "shopify.cart.abandoned" } },
  { id: "n2", type: "card", position: { x: 320, y: 40 }, data: { label: "Wait 1 hour", kind: "wait" } },
  { id: "n3", type: "card", position: { x: 560, y: 40 }, data: { label: "Cart value > AED 200?", kind: "condition" } },
  { id: "n4", type: "card", position: { x: 840, y: -20 }, data: { label: "Send WhatsApp template", kind: "message", sub: "cart_recovery_v3" } },
  { id: "n5", type: "card", position: { x: 840, y: 100 }, data: { label: "Send SMS reminder", kind: "message" } },
  { id: "n6", type: "card", position: { x: 1120, y: 40 }, data: { label: "Tag: cart_recovery", kind: "tag" } },
  { id: "n7", type: "card", position: { x: 1120, y: 160 }, data: { label: "Notify #sales on Slack", kind: "notify" } },
  { id: "n8", type: "card", position: { x: 560, y: 200 }, data: { label: "AI: draft personalized reply", kind: "ai" } },
];
const initialEdges: Edge[] = [
  { id: "e1", source: "n1", target: "n2", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e2", source: "n2", target: "n3", markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e3", source: "n3", target: "n4", label: "yes", markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e4", source: "n3", target: "n5", label: "no", markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e5", source: "n4", target: "n6", markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e6", source: "n4", target: "n7", markerEnd: { type: MarkerType.ArrowClosed } },
  { id: "e7", source: "n3", target: "n8", label: "unsure", markerEnd: { type: MarkerType.ArrowClosed } },
];

export function WorkflowCanvas() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const onConnect = useCallback(
    (c: Connection) => setEdges((eds) => addEdge({ ...c, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges]
  );
  return (
    <div className="h-[600px] rounded-md border bg-muted/10">
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onConnect={onConnect} nodeTypes={nodeTypes} fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
}
