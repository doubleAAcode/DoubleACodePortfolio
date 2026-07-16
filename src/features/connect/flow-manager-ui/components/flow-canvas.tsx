import { useMemo } from "react";
import ReactFlow, { Background, Controls, MiniMap, MarkerType, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";
import { flowSteps } from "@/features/connect/flow-manager-ui/preview-data/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";

const typeColor: Record<string, string> = {
  Welcome: "hsl(var(--primary))",
  Message: "hsl(var(--info))",
  Menu: "hsl(var(--primary))",
  Image: "hsl(var(--warning))",
  Catalog: "hsl(var(--success))",
  Handoff: "hsl(var(--muted-foreground))",
  End: "hsl(var(--muted-foreground))",
};

export function FlowCanvas({ onSelect }: { onSelect?: (id: string) => void }) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = flowSteps.map((s, i) => ({
      id: s.id,
      position: { x: (i % 3) * 260, y: Math.floor(i / 3) * 160 },
      data: {
        label: (
          <div className="text-left">
            <div className="text-[10px] uppercase tracking-wide opacity-70">{s.type}</div>
            <div className="font-medium text-sm mt-0.5">{s.title}</div>
            <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{s.preview}</div>
          </div>
        ),
      },
      style: {
        background: "hsl(var(--card))",
        borderRadius: 8,
        border: `2px solid ${typeColor[s.type] ?? "hsl(var(--border))"}`,
        padding: 10,
        width: 220,
        color: "hsl(var(--foreground))",
        fontSize: 12,
      },
    }));

    const edges: Edge[] = [];
    for (const s of flowSteps) {
      if (!s.options) continue;
      for (const o of s.options) {
        if (!o.nextStepId) continue;
        edges.push({
          id: `${s.id}-${o.id}`,
          source: s.id,
          target: o.nextStepId,
          label: o.labelEn,
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: "hsl(var(--primary))" },
          labelStyle: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
          labelBgStyle: { fill: "hsl(var(--background))" },
        });
      }
    }
    return { nodes, edges };
  }, []);

  return (
    <div className="space-y-3">
      <Card className="bg-info/5 border-info/30">
        <CardContent className="p-3 flex items-center gap-2 text-sm">
          <Info className="h-4 w-4 text-info" />
          Visual preview of the flow. Click any node to edit it in the Guided tab.
        </CardContent>
      </Card>
      <div className="h-[560px] w-full rounded-lg border bg-muted/30">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          onNodeClick={(_e, n) => onSelect?.(n.id)}
          nodesDraggable
          nodesConnectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} />
          <MiniMap pannable zoomable />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
