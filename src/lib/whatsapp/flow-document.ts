import { z } from "zod";

import {
  getEffectiveVisualEdges,
  type VisualFlowBlockType,
  type VisualFlowDefinition,
} from "./visual-flow-builder.ts";
import type {
  FlowDefinition,
  FlowEdge,
  FlowLanguage,
  FlowNode,
  FlowNodeType,
} from "./flow-template-types.ts";

export const CANONICAL_FLOW_SCHEMA_VERSION = 2 as const;

export type CanonicalFlowDocument = {
  schemaVersion: typeof CANONICAL_FLOW_SCHEMA_VERSION;
  startNodeId: string | null;
  nodes: CanonicalFlowNode[];
  edges: CanonicalFlowEdge[];
  editorMetadata?: {
    positions?: Record<string, { x: number; y: number }>;
    viewport?: { x: number; y: number; zoom: number };
  };
};

export type CanonicalFlowNode = {
  id: string;
  type: CanonicalFlowNodeType;
  messages?: Partial<Record<FlowLanguage, string>>;
  labels?: Partial<Record<FlowLanguage, string>>;
  options?: FlowNode["options"];
  protectedAction?: string;
  optional?: boolean;
  config?: Record<string, unknown>;
};

export type CanonicalFlowNodeType = FlowNodeType | "CONDITION";

export type CanonicalFlowEdge = {
  id: string;
  from: string;
  to: string;
  condition?: string | null;
};

export type CanonicalFlowLoadResult =
  | {
      ok: true;
      source: "canonical_v2" | "legacy_runtime" | "legacy_visual" | "legacy_runtime_visual";
      document: CanonicalFlowDocument;
    }
  | {
      ok: false;
      source: "unknown" | "unsupported";
      diagnostics: Array<{ code: string; message: string; path?: string }>;
    };

const languageCopySchema = z.object({ en: z.string().optional(), ar: z.string().optional() });

const canonicalNodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  messages: languageCopySchema.partial().optional(),
  labels: languageCopySchema.partial().optional(),
  options: z
    .array(
      z.object({
        key: z.string(),
        label: languageCopySchema.partial(),
      }),
    )
    .optional(),
  protectedAction: z.string().optional(),
  optional: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
});

const canonicalEdgeSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  condition: z.string().nullable().optional(),
});

export const canonicalFlowDocumentSchema = z.object({
  schemaVersion: z.literal(CANONICAL_FLOW_SCHEMA_VERSION),
  startNodeId: z.string().nullable(),
  nodes: z.array(canonicalNodeSchema),
  edges: z.array(canonicalEdgeSchema),
  editorMetadata: z
    .object({
      positions: z.record(z.object({ x: z.number(), y: z.number() })).optional(),
      viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number() }).optional(),
    })
    .optional(),
});

export function isCanonicalFlowDocument(value: unknown): value is CanonicalFlowDocument {
  return canonicalFlowDocumentSchema.safeParse(value).success;
}

export function loadCanonicalFlowDocument(value: unknown): CanonicalFlowLoadResult {
  if (!isRecord(value)) {
    return failure("FLOW_DOCUMENT_NOT_OBJECT", "Flow document must be an object.");
  }

  if ("schemaVersion" in value) {
    if (value.schemaVersion !== CANONICAL_FLOW_SCHEMA_VERSION) {
      return {
        ok: false,
        source: "unsupported",
        diagnostics: [
          {
            code: "UNSUPPORTED_SCHEMA_VERSION",
            message: `Unsupported flow schema version ${String(value.schemaVersion)}.`,
            path: "schemaVersion",
          },
        ],
      };
    }
    return parseCanonical(value, "canonical_v2");
  }

  const flow = value as Partial<FlowDefinition>;
  if (flow.canonicalDocument) {
    const parsed = loadCanonicalFlowDocument(flow.canonicalDocument);
    if (!parsed.ok) return parsed;
    return { ...parsed, source: "canonical_v2" };
  }

  if (isLegacyVisualFlow(value)) {
    return {
      ok: true,
      source: "legacy_visual",
      document: convertLegacyVisualFlowToCanonical(value),
    };
  }

  if (isLegacyRuntimeFlow(value)) {
    if (isLegacyVisualFlow(flow.visualFlow)) {
      return {
        ok: true,
        source: "legacy_runtime_visual",
        document: convertLegacyVisualFlowToCanonical(flow.visualFlow, value as FlowDefinition),
      };
    }
    return {
      ok: true,
      source: "legacy_runtime",
      document: convertLegacyRuntimeFlowToCanonical(value as FlowDefinition),
    };
  }

  return failure("UNSUPPORTED_FLOW_DOCUMENT", "Flow document format is not supported.");
}

export function convertLegacyRuntimeFlowToCanonical(flow: FlowDefinition): CanonicalFlowDocument {
  return {
    schemaVersion: CANONICAL_FLOW_SCHEMA_VERSION,
    startNodeId: flow.startNodeId || null,
    nodes: flow.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      messages: node.messages,
      labels: node.labels,
      options: node.options,
      protectedAction: node.protectedAction,
      optional: node.optional,
    })),
    edges: flow.edges.map((edge) => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      condition: edge.condition ?? null,
    })),
    editorMetadata: isLegacyVisualFlow(flow.visualFlow)
      ? editorMetadataFromVisual(flow.visualFlow)
      : undefined,
  };
}

export function convertLegacyVisualFlowToCanonical(
  visualFlow: VisualFlowDefinition,
  baseFlow?: FlowDefinition,
): CanonicalFlowDocument {
  const edges = getEffectiveVisualEdges(visualFlow);
  const startNode = visualFlow.nodes.find((node) => node.type === "START") ?? visualFlow.nodes[0];
  const runtimeNodeById = new Map(baseFlow?.nodes.map((node) => [node.id, node]) ?? []);
  return {
    schemaVersion: CANONICAL_FLOW_SCHEMA_VERSION,
    startNodeId: startNode?.id ?? null,
    nodes: visualFlow.nodes.map((node) => {
      const runtimeNode = runtimeNodeById.get(node.id);
      const type = visualToCanonicalType(node.type, node.config.messageBehavior);
      return {
        id: node.id,
        type,
        messages: node.config.messages ?? runtimeNode?.messages,
        labels: node.config.labels ?? runtimeNode?.labels,
        options: node.config.menuOptions?.map((option, index) => ({
          key: option.key || option.action?.toLowerCase() || `option_${index + 1}`,
          label: option.label,
        })),
        protectedAction: runtimeNode?.protectedAction ?? protectedActionFor(type),
        optional: runtimeNode?.optional ?? node.type === "HUMAN_HANDOFF",
        config: stripUndefined({
          visualType: node.type,
          ...node.config,
        }),
      };
    }),
    edges: edges.map((edge) => ({
      id: edge.id,
      from: edge.sourceNodeId,
      to: edge.targetNodeId,
      condition: edge.condition ?? null,
    })),
    editorMetadata: editorMetadataFromVisual(visualFlow),
  };
}

export function canonicalFlowToRuntimeFlow(
  document: CanonicalFlowDocument,
  baseFlow: FlowDefinition,
): FlowDefinition {
  const edgesBySource = new Map<string, FlowEdge[]>();
  const edges = document.edges.map((edge) => ({
    id: edge.id,
    from: edge.from,
    to: edge.to,
    condition: edge.condition ?? null,
  }));
  for (const edge of edges) {
    edgesBySource.set(edge.from, [...(edgesBySource.get(edge.from) ?? []), edge]);
  }
  const nodes: FlowNode[] = document.nodes
    .filter((node): node is CanonicalFlowNode & { type: FlowNodeType } =>
      isRuntimeNodeType(node.type),
    )
    .map((node) => ({
      id: node.id,
      type: node.type,
      messages: node.messages,
      labels: node.labels,
      options: node.options,
      protectedAction: node.protectedAction ?? protectedActionFor(node.type),
      optional: node.optional,
      next: edgesBySource.get(node.id)?.[0]?.to,
    }));

  return {
    ...baseFlow,
    startNodeId: document.startNodeId ?? baseFlow.startNodeId,
    nodes,
    edges,
    canonicalDocument: document,
  };
}

export function withCanonicalFlowDocument(flow: FlowDefinition): FlowDefinition {
  const loaded = loadCanonicalFlowDocument(flow);
  if (!loaded.ok) return flow;
  return { ...flow, canonicalDocument: loaded.document };
}

function parseCanonical(value: unknown, source: "canonical_v2"): CanonicalFlowLoadResult {
  const parsed = canonicalFlowDocumentSchema.safeParse(value);
  if (!parsed.success) {
    return {
      ok: false,
      source: "unsupported",
      diagnostics: parsed.error.issues.map((issue) => ({
        code: "CANONICAL_SCHEMA_INVALID",
        message: issue.message,
        path: issue.path.join("."),
      })),
    };
  }
  return { ok: true, source, document: parsed.data as CanonicalFlowDocument };
}

function failure(code: string, message: string): CanonicalFlowLoadResult {
  return { ok: false, source: "unknown", diagnostics: [{ code, message }] };
}

function isLegacyRuntimeFlow(value: unknown): value is FlowDefinition {
  if (!isRecord(value)) return false;
  return Array.isArray(value.nodes) && Array.isArray(value.edges) && typeof value.id === "string";
}

function isLegacyVisualFlow(value: unknown): value is VisualFlowDefinition {
  if (!isRecord(value)) return false;
  return value.version === 1 && Array.isArray(value.nodes) && Array.isArray(value.edges);
}

function editorMetadataFromVisual(visualFlow: VisualFlowDefinition) {
  return {
    positions: Object.fromEntries(visualFlow.nodes.map((node) => [node.id, node.position])),
  };
}

function visualToCanonicalType(
  type: VisualFlowBlockType,
  messageBehavior?: string,
): CanonicalFlowNodeType {
  if (type === "LANGUAGE_SELECTION") return "LANGUAGE_SELECT";
  if (type === "MAIN_MENU") return "MAIN_MENU";
  if (type === "SEND_MESSAGE" && messageBehavior === "options") return "MAIN_MENU";
  if (type === "CATEGORY_SELECTION") return "CATEGORY_SELECT";
  if (type === "PRODUCT_SELECTION") return "PRODUCT_SELECT";
  if (type === "PRODUCT_DETAILS") return "PRODUCT_DETAILS";
  if (type === "QUESTION") return "CUSTOM_FIELDS";
  if (type === "CONDITION") return "CONDITION";
  if (type === "CART_REVIEW") return "CART_MENU";
  if (type.startsWith("CHECKOUT_")) return "CHECKOUT";
  if (type === "ORDER_REVIEW") return "ORDER_REVIEW";
  if (type === "ORDER_CONFIRMATION") return "ORDER_CONFIRMATION";
  if (type === "HUMAN_HANDOFF") return "HUMAN_HANDOFF";
  if (type === "END") return "END";
  return "MESSAGE";
}

const runtimeNodeTypes: ReadonlySet<string> = new Set([
  "MESSAGE",
  "LANGUAGE_SELECT",
  "MAIN_MENU",
  "CATEGORY_SELECT",
  "PRODUCT_SELECT",
  "PRODUCT_DETAILS",
  "PRODUCT_OPTIONS",
  "CUSTOM_FIELDS",
  "QUANTITY",
  "CART_MENU",
  "CHECKOUT",
  "ORDER_REVIEW",
  "ORDER_CONFIRMATION",
  "HUMAN_HANDOFF",
  "END",
]);

export function isRuntimeNodeType(type: string): type is FlowNodeType {
  return runtimeNodeTypes.has(type);
}

function protectedActionFor(type: string) {
  const protectedActions: Partial<Record<FlowNodeType, string>> = {
    CATEGORY_SELECT: "catalog.categories",
    PRODUCT_SELECT: "catalog.products",
    PRODUCT_OPTIONS: "catalog.options",
    CUSTOM_FIELDS: "catalog.custom_fields",
    QUANTITY: "cart.validate_quantity",
    CART_MENU: "cart.service",
    CHECKOUT: "checkout.service",
    ORDER_REVIEW: "order.review",
    ORDER_CONFIRMATION: "order.create_pending",
  };
  return isRuntimeNodeType(type) ? protectedActions[type] : undefined;
}

function stripUndefined(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
