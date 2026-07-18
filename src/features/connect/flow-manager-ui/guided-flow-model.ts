import {
  loadCanonicalFlowDocument,
  type CanonicalFlowDocument,
  type CanonicalFlowLoadResult,
  type CanonicalFlowNode,
} from "../shared/flow-document.ts";
import type {
  BusinessFlowDetails,
  BusinessFlowVersionRow,
} from "../shared/flow-template-store.server.ts";
import type { FlowValidationIssue } from "../shared/flow-template-types.ts";

export type GuidedStepKind =
  | "Welcome"
  | "Message"
  | "Menu"
  | "Image"
  | "Catalog"
  | "Branch"
  | "Handoff"
  | "End";

export type GuidedFlowOption = {
  key: string;
  labelEn: string;
  labelAr: string;
  active: boolean;
  targetNodeId: string | null;
  targetTitle: string;
  missingTarget: boolean;
};

export type GuidedFlowStep = {
  id: string;
  kind: GuidedStepKind;
  canonicalType: CanonicalFlowNode["type"];
  title: string;
  preview: string;
  isStart: boolean;
  messages: { en: string; ar: string };
  labels: { en: string; ar: string };
  mediaUrl: string;
  mediaCaption: { en: string; ar: string };
  protectedAction: string | null;
  optional: boolean;
  options: GuidedFlowOption[];
  nextSteps: Array<{ edgeId: string; id: string; title: string; missing: boolean }>;
  issues: FlowValidationIssue[];
  status: "ok" | "warning" | "error";
};

export type GuidedFlowModel = {
  flowId: string;
  flowName: string;
  flowStatus: NonNullable<BusinessFlowDetails["flow"]>["status"];
  version: BusinessFlowVersionRow;
  versions: BusinessFlowVersionRow[];
  activeVersionId: string | null;
  source: Extract<CanonicalFlowLoadResult, { ok: true }>["source"];
  document: CanonicalFlowDocument;
  steps: GuidedFlowStep[];
  diagnostics: FlowValidationIssue[];
};

export type GuidedFlowModelResult =
  | { ok: true; model: GuidedFlowModel }
  | {
      ok: false;
      code: "NO_FLOW" | "NO_VERSION" | "INVALID_DOCUMENT";
      message: string;
      diagnostics: Array<{ code: string; message: string; path?: string }>;
    };

export function createGuidedFlowModel(
  details: BusinessFlowDetails,
  preferredVersionId?: string,
): GuidedFlowModelResult {
  if (!details.flow) {
    return {
      ok: false,
      code: "NO_FLOW",
      message: "No WhatsApp flow has been created for this business yet.",
      diagnostics: [],
    };
  }

  const versions = [...details.versions].sort(
    (left, right) => right.version_number - left.version_number,
  );
  const version =
    versions.find((item) => item.id === preferredVersionId) ??
    versions.find((item) => item.status === "DRAFT") ??
    details.activeVersion ??
    versions[0];
  if (!version) {
    return {
      ok: false,
      code: "NO_VERSION",
      message: "This WhatsApp flow does not have a saved version yet.",
      diagnostics: [],
    };
  }

  const loaded = loadCanonicalFlowDocument(version.flow_json);
  if (!loaded.ok) {
    return {
      ok: false,
      code: "INVALID_DOCUMENT",
      message: "The saved flow document cannot be opened in Guided.",
      diagnostics: loaded.diagnostics,
    };
  }

  const issues = version.validation_result?.issues ?? [];
  const orderedNodes = orderNodes(loaded.document);
  const nodeById = new Map(loaded.document.nodes.map((node) => [node.id, node]));
  const titleById = new Map(
    loaded.document.nodes.map((node) => [node.id, nodeTitle(node, loaded.document.startNodeId)]),
  );

  return {
    ok: true,
    model: {
      flowId: details.flow.id,
      flowName: details.flow.name,
      flowStatus: details.flow.status,
      version,
      versions,
      activeVersionId: details.activeVersion?.id ?? null,
      source: loaded.source,
      document: loaded.document,
      diagnostics: issues,
      steps: orderedNodes.map((node) => {
        const nodeIssues = issues.filter((issue) => issue.nodeId === node.id);
        const outgoing = loaded.document.edges.filter((edge) => edge.from === node.id);
        const options = [...(node.options ?? [])]
          .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))
          .map((option) => {
            const targetNodeId =
              option.targetNodeId ??
              outgoing.find((edge) => edge.condition === option.key)?.to ??
              null;
            return {
              key: option.key,
              labelEn: option.label.en?.trim() || option.key,
              labelAr: option.label.ar?.trim() || "",
              active: option.active !== false,
              targetNodeId,
              targetTitle: targetNodeId
                ? (titleById.get(targetNodeId) ?? "Missing destination")
                : "No destination",
              missingTarget: Boolean(targetNodeId && !nodeById.has(targetNodeId)),
            };
          });
        const optionTargets = new Set(options.flatMap((option) => option.targetNodeId ?? []));
        const nextSteps = outgoing
          .filter((edge) => !optionTargets.has(edge.to))
          .map((edge) => ({
            edgeId: edge.id,
            id: edge.to,
            title: titleById.get(edge.to) ?? "Missing destination",
            missing: !nodeById.has(edge.to),
          }));

        return {
          id: node.id,
          kind: stepKind(node, loaded.document.startNodeId),
          canonicalType: node.type,
          title: titleById.get(node.id)!,
          preview: nodePreview(node),
          isStart: node.id === loaded.document.startNodeId,
          messages: { en: node.messages?.en ?? "", ar: node.messages?.ar ?? "" },
          labels: { en: node.labels?.en ?? "", ar: node.labels?.ar ?? "" },
          mediaUrl: node.mediaUrl ?? "",
          mediaCaption: {
            en: node.mediaCaption?.en ?? "",
            ar: node.mediaCaption?.ar ?? "",
          },
          protectedAction: node.protectedAction ?? null,
          optional: Boolean(node.optional),
          options,
          nextSteps,
          issues: nodeIssues,
          status: nodeIssues.some((issue) => issue.severity === "ERROR")
            ? "error"
            : nodeIssues.length
              ? "warning"
              : "ok",
        };
      }),
    },
  };
}

function orderNodes(document: CanonicalFlowDocument) {
  const nodeById = new Map(document.nodes.map((node) => [node.id, node]));
  const outgoing = new Map<string, string[]>();
  for (const edge of document.edges) {
    outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge.to]);
  }
  for (const node of document.nodes) {
    for (const option of node.options ?? []) {
      if (!option.targetNodeId) continue;
      outgoing.set(node.id, [...(outgoing.get(node.id) ?? []), option.targetNodeId]);
    }
  }

  const ordered: CanonicalFlowNode[] = [];
  const visited = new Set<string>();
  const queue = document.startNodeId ? [document.startNodeId] : [];
  while (queue.length) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = nodeById.get(id);
    if (!node) continue;
    ordered.push(node);
    queue.push(...(outgoing.get(id) ?? []));
  }
  ordered.push(...document.nodes.filter((node) => !visited.has(node.id)));
  return ordered;
}

function nodeTitle(node: CanonicalFlowNode, startNodeId: string | null) {
  if (node.title?.trim()) return node.title.trim();
  if (node.id === startNodeId) return "Welcome";
  return humanize(node.type);
}

function nodePreview(node: CanonicalFlowNode) {
  return (
    node.messages?.en?.trim() ||
    node.labels?.en?.trim() ||
    node.mediaCaption?.en?.trim() ||
    node.protectedAction ||
    humanize(node.type)
  );
}

function stepKind(node: CanonicalFlowNode, startNodeId: string | null): GuidedStepKind {
  if (node.id === startNodeId) return "Welcome";
  if (node.type === "IMAGE_MESSAGE") return "Image";
  if (node.type === "HUMAN_HANDOFF") return "Handoff";
  if (node.type === "END") return "End";
  if (node.type === "CONDITION") return "Branch";
  if (["MAIN_MENU", "LANGUAGE_SELECT", "CART_MENU"].includes(node.type)) return "Menu";
  if (
    [
      "CATEGORY_SELECT",
      "PRODUCT_SELECT",
      "PRODUCT_DETAILS",
      "PRODUCT_OPTIONS",
      "CUSTOM_FIELDS",
      "QUANTITY",
      "CHECKOUT",
      "ORDER_REVIEW",
      "ORDER_CONFIRMATION",
    ].includes(node.type)
  ) {
    return "Catalog";
  }
  return "Message";
}

function humanize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
