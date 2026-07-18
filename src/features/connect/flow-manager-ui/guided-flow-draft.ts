import {
  canonicalFlowToRuntimeFlow,
  type CanonicalFlowDocument,
  type CanonicalFlowNode,
} from "../shared/flow-document.ts";
import type { FlowDefinition, FlowNodeOption } from "../shared/flow-template-types.ts";

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

export function updateGuidedOption(
  document: CanonicalFlowDocument,
  nodeId: string,
  optionKey: string,
  update: (option: FlowNodeOption) => FlowNodeOption,
): CanonicalFlowDocument {
  return updateGuidedNode(document, nodeId, (node) => ({
    ...node,
    options: node.options?.map((option) => (option.key === optionKey ? update(option) : option)),
  }));
}

export function serializeGuidedDocument(document: CanonicalFlowDocument) {
  return JSON.stringify(document);
}
