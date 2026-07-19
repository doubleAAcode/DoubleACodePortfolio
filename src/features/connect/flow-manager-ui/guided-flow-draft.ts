import {
  canonicalFlowToRuntimeFlow,
  type CanonicalFlowDocument,
  type CanonicalFlowNode,
} from "../shared/flow-document.ts";
import type { FlowDefinition, FlowNodeOption } from "../shared/flow-template-types.ts";

export type GuidedNewStepType = "MESSAGE" | "IMAGE_MESSAGE" | "MAIN_MENU" | "HUMAN_HANDOFF" | "END";

export const GUIDED_WHATSAPP_REPLY_OPTION_LIMIT = 3;
export const GUIDED_WHATSAPP_BUTTON_TITLE_MAX = 20;
export const GUIDED_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const GUIDED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type GuidedNewChoiceInput = {
  labelEn: string;
  labelAr?: string;
  targetNodeId: string;
};

export type GuidedInboundReference =
  | {
      kind: "option";
      sourceNodeId: string;
      optionKey: string;
    }
  | {
      kind: "edge";
      sourceNodeId: string;
      edgeId: string;
    };

export type GuidedDeleteRepair =
  | { mode: "remove" }
  | { mode: "replace"; replacementNodeId: string };

export function createGuidedDraftFlow(
  baseFlow: FlowDefinition,
  document: CanonicalFlowDocument,
): FlowDefinition {
  const baseWithoutLegacyEditors: FlowDefinition = {
    ...baseFlow,
    canonicalDocument: document,
    visualFlow: undefined,
    compiledRuntimeFlowJson: undefined,
  };
  const synchronized = canonicalFlowToRuntimeFlow(document, baseWithoutLegacyEditors);
  return {
    ...synchronized,
    canonicalDocument: document,
    visualFlow: undefined,
    compiledRuntimeFlowJson: undefined,
  };
}

export function updateGuidedNode(
  document: CanonicalFlowDocument,
  nodeId: string,
  update: (node: CanonicalFlowNode) => CanonicalFlowNode,
): CanonicalFlowDocument {
  return {
    ...document,
    nodes: document.nodes.map((node) => (node.id === nodeId ? update(node) : node)),
  };
}

export function validateGuidedImageFile(file: Pick<File, "size" | "type">) {
  if (!GUIDED_IMAGE_TYPES.includes(file.type as (typeof GUIDED_IMAGE_TYPES)[number])) {
    return "Upload a JPG, PNG, or WebP image.";
  }
  if (file.size > GUIDED_IMAGE_MAX_BYTES) return "Image must be 3 MB or smaller.";
  if (file.size <= 0) return "The selected image is empty.";
  return undefined;
}

export function updateGuidedImageMedia(
  document: CanonicalFlowDocument,
  nodeId: string,
  mediaUrl: string | undefined,
) {
  const node = document.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) throw new Error("The image step no longer exists.");
  if (node.type !== "IMAGE_MESSAGE") {
    throw new Error("Images can only be attached to an Image message step.");
  }
  const normalizedUrl = mediaUrl?.trim();
  if (normalizedUrl && !/^https?:\/\//i.test(normalizedUrl)) {
    throw new Error("The uploaded image URL is not public.");
  }
  return updateGuidedNode(document, nodeId, (current) => ({
    ...current,
    mediaUrl: normalizedUrl || undefined,
  }));
}

export function updateGuidedOption(
  document: CanonicalFlowDocument,
  nodeId: string,
  optionKey: string,
  update: (option: FlowNodeOption) => FlowNodeOption,
): CanonicalFlowDocument {
  const node = document.nodes.find((candidate) => candidate.id === nodeId);
  const current = node?.options?.find((option) => option.key === optionKey);
  if (!node || !current) throw new Error("The choice to update no longer exists.");
  const nextOption = update(current);
  if (nextOption.key !== optionKey) {
    throw new Error("Stable choice keys cannot be changed.");
  }
  const nextDocument = updateGuidedNode(document, nodeId, (candidate) => ({
    ...candidate,
    options: candidate.options?.map((option) => (option.key === optionKey ? nextOption : option)),
  }));
  return synchronizeGuidedOptionEdge(nextDocument, nodeId, optionKey, nextOption.targetNodeId);
}

export function addGuidedOption(
  document: CanonicalFlowDocument,
  nodeId: string,
  input: GuidedNewChoiceInput,
) {
  const node = document.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) throw new Error("The step for this choice no longer exists.");
  const options = node.options ?? [];
  if (options.length >= GUIDED_WHATSAPP_REPLY_OPTION_LIMIT) {
    throw new Error("A WhatsApp step can have at most three reply choices.");
  }
  const labelEn = input.labelEn.trim();
  const labelAr = input.labelAr?.trim() ?? "";
  if (!labelEn) throw new Error("Add the English button text.");
  if (labelEn.length > GUIDED_WHATSAPP_BUTTON_TITLE_MAX) {
    throw new Error("WhatsApp button text must be 20 characters or fewer.");
  }
  if (labelAr.length > GUIDED_WHATSAPP_BUTTON_TITLE_MAX) {
    throw new Error("WhatsApp Arabic button text must be 20 characters or fewer.");
  }
  if (options.some((option) => option.label.en?.trim().toLowerCase() === labelEn.toLowerCase())) {
    throw new Error("Each choice needs different English button text.");
  }
  if (input.targetNodeId === nodeId) {
    throw new Error("Choose a different destination step.");
  }
  if (!document.nodes.some((candidate) => candidate.id === input.targetNodeId)) {
    throw new Error("Choose a valid destination step.");
  }

  const optionKey = nextUniqueId(
    options.map((option) => option.key),
    labelEn,
  );
  const option: FlowNodeOption = {
    key: optionKey,
    label: { en: labelEn, ar: labelAr },
    active: true,
    sortOrder: Math.max(0, ...options.map((candidate) => candidate.sortOrder ?? 0)) + 1,
    targetNodeId: input.targetNodeId,
  };
  const nextDocument = updateGuidedNode(document, nodeId, (candidate) => ({
    ...candidate,
    options: [...(candidate.options ?? []), option],
  }));
  return {
    optionKey,
    document: synchronizeGuidedOptionEdge(nextDocument, nodeId, optionKey, input.targetNodeId),
  };
}

export function removeGuidedOption(
  document: CanonicalFlowDocument,
  nodeId: string,
  optionKey: string,
) {
  const node = document.nodes.find((candidate) => candidate.id === nodeId);
  if (!node?.options?.some((option) => option.key === optionKey)) {
    throw new Error("The choice to remove no longer exists.");
  }
  const nextDocument = updateGuidedNode(document, nodeId, (candidate) => ({
    ...candidate,
    options: candidate.options
      ?.filter((option) => option.key !== optionKey)
      .map((option, index) => ({ ...option, sortOrder: index + 1 })),
  }));
  return synchronizeGuidedOptionEdge(nextDocument, nodeId, optionKey, undefined);
}

export function updateGuidedAutomaticDestination(
  document: CanonicalFlowDocument,
  nodeId: string,
  targetNodeId: string | undefined,
) {
  if (!document.nodes.some((node) => node.id === nodeId)) {
    throw new Error("The step to route no longer exists.");
  }
  if (targetNodeId === nodeId) {
    throw new Error("Choose a different automatic destination.");
  }
  if (targetNodeId && !document.nodes.some((node) => node.id === targetNodeId)) {
    throw new Error("Choose a valid automatic destination.");
  }

  let synchronized = false;
  const edges = document.edges.flatMap((edge) => {
    if (edge.from !== nodeId || edge.condition?.trim()) return [edge];
    if (!targetNodeId || synchronized) return [];
    synchronized = true;
    return [{ ...edge, to: targetNodeId, condition: null }];
  });
  if (targetNodeId && !synchronized) {
    edges.push({
      id: nextUniqueId(
        document.edges.map((edge) => edge.id),
        `edge_${nodeId}_next`,
      ),
      from: nodeId,
      to: targetNodeId,
      condition: null,
    });
  }
  return { ...document, edges };
}

export function createGuidedNode(
  document: CanonicalFlowDocument,
  input: { type: GuidedNewStepType; title: string },
) {
  const id = nextUniqueId(
    document.nodes.map((node) => node.id),
    `step_${input.type.toLowerCase()}`,
  );
  const node = createNodeTemplate(id, input.type, input.title.trim());
  return {
    nodeId: id,
    document: {
      ...document,
      nodes: [...document.nodes, node],
    },
  };
}

export function duplicateGuidedNode(document: CanonicalFlowDocument, nodeId: string) {
  const sourceIndex = document.nodes.findIndex((node) => node.id === nodeId);
  if (sourceIndex < 0) throw new Error("The step to duplicate no longer exists.");
  const source = document.nodes[sourceIndex];
  const duplicateId = nextUniqueId(
    document.nodes.map((node) => node.id),
    `${source.id}_copy`,
  );
  const duplicate: CanonicalFlowNode = {
    ...structuredClone(source),
    id: duplicateId,
    title: `${source.title?.trim() || humanize(source.type)} copy`,
  };
  const nodes = [...document.nodes];
  nodes.splice(sourceIndex + 1, 0, duplicate);

  const usedEdgeIds = document.edges.map((edge) => edge.id);
  const duplicatedEdges = document.edges
    .filter((edge) => edge.from === source.id)
    .map((edge) => {
      const id = nextUniqueId(
        [...usedEdgeIds],
        `edge_${duplicateId}_${edge.condition?.trim() || "next"}`,
      );
      usedEdgeIds.push(id);
      return { ...edge, id, from: duplicateId };
    });

  return {
    nodeId: duplicateId,
    document: {
      ...document,
      nodes,
      edges: [...document.edges, ...duplicatedEdges],
    },
  };
}

export function moveGuidedNode(
  document: CanonicalFlowDocument,
  nodeId: string,
  direction: "up" | "down",
) {
  const index = document.nodes.findIndex((node) => node.id === nodeId);
  if (index < 0) throw new Error("The step to move no longer exists.");
  if (document.startNodeId === nodeId) return document;
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  const firstMovableIndex = document.startNodeId ? 1 : 0;
  if (targetIndex < firstMovableIndex || targetIndex >= document.nodes.length) return document;
  const nodes = [...document.nodes];
  [nodes[index], nodes[targetIndex]] = [nodes[targetIndex], nodes[index]];
  return { ...document, nodes };
}

export function listGuidedInboundReferences(
  document: CanonicalFlowDocument,
  nodeId: string,
): GuidedInboundReference[] {
  const optionReferences = document.nodes.flatMap((node) =>
    (node.options ?? [])
      .filter((option) => option.targetNodeId === nodeId)
      .map((option) => ({
        kind: "option" as const,
        sourceNodeId: node.id,
        optionKey: option.key,
      })),
  );
  const edgeReferences = document.edges
    .filter((edge) => {
      if (edge.to !== nodeId) return false;
      const source = document.nodes.find((node) => node.id === edge.from);
      return !(source?.options ?? []).some((option) => option.targetNodeId === nodeId);
    })
    .map((edge) => ({
      kind: "edge" as const,
      sourceNodeId: edge.from,
      edgeId: edge.id,
    }));
  return [...optionReferences, ...edgeReferences];
}

export function deleteGuidedNode(
  document: CanonicalFlowDocument,
  nodeId: string,
  repair?: GuidedDeleteRepair,
) {
  if (document.startNodeId === nodeId) {
    throw new Error("The start step cannot be deleted. Choose another start step first.");
  }
  if (!document.nodes.some((node) => node.id === nodeId)) {
    throw new Error("The step to delete no longer exists.");
  }
  const inbound = listGuidedInboundReferences(document, nodeId).filter(
    (reference) => reference.sourceNodeId !== nodeId,
  );
  if (inbound.length && !repair) {
    throw new Error("Choose how to repair routes that point to this step.");
  }
  if (repair?.mode === "replace") {
    if (repair.replacementNodeId === nodeId) {
      throw new Error("Choose a different replacement step.");
    }
    if (!document.nodes.some((node) => node.id === repair.replacementNodeId)) {
      throw new Error("The replacement step no longer exists.");
    }
  }

  const replacementNodeId = repair?.mode === "replace" ? repair.replacementNodeId : undefined;
  const nodes = document.nodes
    .filter((node) => node.id !== nodeId)
    .map((node) => ({
      ...node,
      options: node.options?.map((option) =>
        option.targetNodeId === nodeId
          ? {
              ...option,
              targetNodeId: replacementNodeId,
            }
          : option,
      ),
    }));
  const edges = document.edges
    .filter((edge) => edge.from !== nodeId)
    .flatMap((edge) => {
      if (edge.to !== nodeId) return [edge];
      return replacementNodeId ? [{ ...edge, to: replacementNodeId }] : [];
    });
  const positions = document.editorMetadata?.positions;
  const nextPositions = positions ? { ...positions } : undefined;
  if (nextPositions) delete nextPositions[nodeId];

  return {
    ...document,
    nodes,
    edges,
    editorMetadata: document.editorMetadata
      ? { ...document.editorMetadata, positions: nextPositions }
      : undefined,
  };
}

export function serializeGuidedDocument(document: CanonicalFlowDocument) {
  return JSON.stringify(document);
}

function createNodeTemplate(id: string, type: GuidedNewStepType, title: string): CanonicalFlowNode {
  const node: CanonicalFlowNode = {
    id,
    type,
    title: title || humanize(type),
  };
  if (type !== "END") node.messages = { en: "", ar: "" };
  if (type === "IMAGE_MESSAGE") node.mediaCaption = { en: "", ar: "" };
  if (type === "MAIN_MENU") node.options = [];
  if (type === "HUMAN_HANDOFF") node.optional = true;
  return node;
}

function nextUniqueId(existingIds: string[], base: string) {
  const normalizedBase =
    base
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "") || "step";
  const existing = new Set(existingIds);
  if (!existing.has(normalizedBase)) return normalizedBase;
  let suffix = 2;
  while (existing.has(`${normalizedBase}_${suffix}`)) suffix += 1;
  return `${normalizedBase}_${suffix}`;
}

function synchronizeGuidedOptionEdge(
  document: CanonicalFlowDocument,
  nodeId: string,
  optionKey: string,
  targetNodeId: string | undefined,
) {
  let synchronized = false;
  const edges = document.edges.flatMap((edge) => {
    if (edge.from !== nodeId || edge.condition !== optionKey) return [edge];
    if (!targetNodeId || synchronized) return [];
    synchronized = true;
    return [{ ...edge, to: targetNodeId }];
  });
  if (targetNodeId && !synchronized) {
    edges.push({
      id: nextUniqueId(
        document.edges.map((edge) => edge.id),
        `edge_${nodeId}_${optionKey}`,
      ),
      from: nodeId,
      to: targetNodeId,
      condition: optionKey,
    });
  }
  return { ...document, edges };
}

function humanize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
