import {
  isRuntimeNodeType,
  loadCanonicalFlowDocument,
  type CanonicalFlowDocument,
  type CanonicalFlowEdge,
  type CanonicalFlowNode,
} from "./flow-document.ts";

export type FlowDiagnosticSeverity = "error" | "warning";
export type FlowValidationPhase = "structural" | "draft" | "publish" | "runtime";
export type FlowValidationMode = "save" | "draft" | "publish";

export type FlowDiagnostic = {
  code: string;
  severity: FlowDiagnosticSeverity;
  phase: FlowValidationPhase;
  message: string;
  nodeId?: string;
  edgeId?: string;
  path?: string;
  suggestedFix?: string;
};

export type CanonicalFlowValidationResult = {
  ok: boolean;
  diagnostics: FlowDiagnostic[];
};

const WHATSAPP_MAX_BUTTONS = 3;
const WHATSAPP_BUTTON_TITLE_MAX = 20;
const AUTO_TRANSITION_TYPES = new Set(["MESSAGE", "IMAGE_MESSAGE"]);
const TERMINAL_TYPES = new Set(["END", "HUMAN_HANDOFF"]);
const WAIT_FOR_INPUT_TYPES = new Set([
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
]);

export function validateFlow(
  value: unknown,
  options: { mode: FlowValidationMode },
): CanonicalFlowValidationResult {
  const loaded = loadCanonicalFlowDocument(value);
  if (!loaded.ok) {
    return {
      ok: false,
      diagnostics: loaded.diagnostics.map((diagnostic) => ({
        code: diagnostic.code,
        message: diagnostic.message,
        path: diagnostic.path,
        severity: "error",
        phase: "structural",
        suggestedFix: "Open the Advanced tab and confirm the saved flow JSON is valid.",
      })),
    };
  }
  return validateCanonicalFlowDocument(loaded.document, options);
}

export function validateCanonicalFlowDocument(
  document: CanonicalFlowDocument,
  options: { mode: FlowValidationMode },
): CanonicalFlowValidationResult {
  const diagnostics: FlowDiagnostic[] = [];
  validateStructure(document, diagnostics);
  if (options.mode !== "save") validateDraft(document, diagnostics);
  if (options.mode === "publish") validatePublish(document, diagnostics);
  return {
    ok: !diagnostics.some((diagnostic) => diagnostic.severity === "error"),
    diagnostics,
  };
}

export function flowDiagnosticsToLegacyResult(diagnostics: FlowDiagnostic[]) {
  return {
    ok: !diagnostics.some((diagnostic) => diagnostic.severity === "error"),
    issues: diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      message: diagnostic.message,
      severity: diagnostic.severity === "error" ? ("ERROR" as const) : ("WARNING" as const),
      nodeId: diagnostic.nodeId,
      edgeId: diagnostic.edgeId,
      path: diagnostic.path,
      suggestedFix: diagnostic.suggestedFix,
    })),
  };
}

function validateStructure(document: CanonicalFlowDocument, diagnostics: FlowDiagnostic[]) {
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();

  if (document.schemaVersion !== 2) {
    diagnostics.push(
      error("UNSUPPORTED_SCHEMA_VERSION", "Only canonical flow schema version 2 is supported."),
    );
  }
  if (!Array.isArray(document.nodes)) {
    diagnostics.push(error("NODES_INVALID", "Flow nodes must be an array."));
    return;
  }
  if (!Array.isArray(document.edges)) {
    diagnostics.push(error("EDGES_INVALID", "Flow edges must be an array."));
    return;
  }

  for (const node of document.nodes) {
    if (!node || typeof node !== "object") {
      diagnostics.push(error("NODE_INVALID", "Every node must be an object."));
      continue;
    }
    if (!text(node.id)) {
      diagnostics.push(error("NODE_ID_REQUIRED", "Every node needs a stable id."));
      continue;
    }
    if (nodeIds.has(node.id)) {
      diagnostics.push(error("DUPLICATE_NODE_ID", `Duplicate node id ${node.id}.`, node.id));
    }
    nodeIds.add(node.id);
    if (!text(node.type)) {
      diagnostics.push(error("NODE_TYPE_REQUIRED", `${node.id} needs a node type.`, node.id));
    }
    if (node.type !== "CONDITION" && !isRuntimeNodeType(node.type)) {
      diagnostics.push(
        error("UNSUPPORTED_NODE_TYPE", `${node.id} uses unsupported node type ${node.type}.`, node.id),
      );
    }
  }

  for (const edge of document.edges) {
    if (!edge || typeof edge !== "object") {
      diagnostics.push(error("EDGE_INVALID", "Every edge must be an object."));
      continue;
    }
    if (!text(edge.id)) {
      diagnostics.push(error("EDGE_ID_REQUIRED", "Every edge needs a stable id."));
      continue;
    }
    if (edgeIds.has(edge.id)) {
      diagnostics.push(error("DUPLICATE_EDGE_ID", `Duplicate edge id ${edge.id}.`, undefined, edge.id));
    }
    edgeIds.add(edge.id);
    if (!nodeIds.has(edge.from)) {
      diagnostics.push(
        error("EDGE_SOURCE_MISSING", `Edge ${edge.id} points from a missing node.`, edge.from, edge.id),
      );
    }
    if (!nodeIds.has(edge.to)) {
      diagnostics.push(
        error("EDGE_TARGET_MISSING", `Edge ${edge.id} points to a missing node.`, edge.to, edge.id),
      );
    }
  }
}

function validateDraft(document: CanonicalFlowDocument, diagnostics: FlowDiagnostic[]) {
  const reachable = getReachableNodes(document);
  if (!document.startNodeId) {
    diagnostics.push(
      warning(
        "START_MISSING",
        "Choose a first WhatsApp step before publishing.",
        undefined,
        "Open the Conversation map and connect the first customer-facing step.",
      ),
    );
  }

  for (const node of document.nodes) {
    if (document.startNodeId && !reachable.has(node.id)) {
      diagnostics.push(
        warning(
          "UNREACHABLE_NODE",
          `${node.id} is not reachable from the first step.`,
          node.id,
          "Connect this step from the main path or remove it if it is no longer used.",
        ),
      );
    }
    if (isMessageLike(node) && !messageText(node)) {
      diagnostics.push(
        warning(
          "EMPTY_MESSAGE",
          `${nodeName(node)} has no message text yet.`,
          node.id,
          "Select this step and add the WhatsApp message text.",
        ),
      );
    }
    if (node.type === "IMAGE_MESSAGE") validateImageDraft(node, diagnostics);
    if (node.type === "MAIN_MENU") {
      validateChoiceDraft(node, diagnostics);
    }
    if (node.type === "CONDITION") {
      diagnostics.push(
        warning(
          "CONDITION_UNSUPPORTED",
          "Condition blocks are not publishable until runtime condition handling is implemented.",
          node.id,
          "Use supported template actions instead: options, message, image, catalog browse, purchase, handoff, or end.",
        ),
      );
    }
    if (!TERMINAL_TYPES.has(node.type) && !outgoing(document.edges, node.id).length) {
      diagnostics.push(
        warning(
          "DEAD_END",
          `${nodeName(node)} has no next step.`,
          node.id,
          "Choose what happens after this step, or end the conversation here.",
        ),
      );
    }
  }
}

function validatePublish(document: CanonicalFlowDocument, diagnostics: FlowDiagnostic[]) {
  const nodeById = new Map(document.nodes.map((node) => [node.id, node]));
  const startNode = document.startNodeId ? nodeById.get(document.startNodeId) : undefined;
  if (!document.startNodeId) {
    diagnostics.push(
      error(
        "PUBLISH_START_REQUIRED",
        "Publish requires a first WhatsApp step.",
        undefined,
        undefined,
        "Open the Conversation map and choose the first customer-facing step.",
      ),
    );
    return;
  }
  if (!startNode) {
    diagnostics.push(
      error(
        "PUBLISH_START_MISSING",
        "The configured first WhatsApp step does not exist.",
        undefined,
        undefined,
        "Reconnect the start step or clone a supported template again.",
      ),
    );
    return;
  }

  const reachable = getReachableNodes(document);
  for (const nodeId of reachable) {
    const node = nodeById.get(nodeId);
    if (!node) continue;
    if (node.type === "CONDITION") {
      diagnostics.push(
        error(
          "CONDITION_UNSUPPORTED_FOR_PUBLISH",
          "Condition blocks cannot be published until runtime condition handling is implemented.",
          node.id,
          undefined,
          "Replace this condition with a supported options step.",
        ),
      );
      continue;
    }
    if (!isRuntimeNodeType(node.type)) {
      diagnostics.push(
        error(
          "PUBLISH_NODE_UNSUPPORTED",
          `${nodeName(node)} cannot execute at runtime.`,
          node.id,
          undefined,
          "Replace this block with a supported template action.",
        ),
      );
      continue;
    }
    if (isMessageLike(node) && !messageText(node)) {
      diagnostics.push(
        error(
          "PUBLISH_MESSAGE_EMPTY",
          `${nodeName(node)} needs message text.`,
          node.id,
          undefined,
          "Select this step and add the WhatsApp message text.",
        ),
      );
    }
    if (node.type === "IMAGE_MESSAGE") validateImagePublish(node, diagnostics);
    if (node.type === "MAIN_MENU") validateChoicePublish(document, node, diagnostics);
    if (!isExecutableTerminal(node) && !outgoing(document.edges, node.id).length) {
      diagnostics.push(
        error(
          "PUBLISH_DEAD_END",
          `${nodeName(node)} has no deterministic next step.`,
          node.id,
          undefined,
          "Choose the next step, return to a menu, or end the conversation.",
        ),
      );
    }
  }

  detectGuaranteedAutomaticCycle(document, diagnostics);
}

function validateChoiceDraft(node: CanonicalFlowNode, diagnostics: FlowDiagnostic[]) {
  const options = activeOptions(node);
  if (!options.length) {
    diagnostics.push(
      warning(
        "CHOICE_OPTIONS_MISSING",
        `${nodeName(node)} needs at least one active option.`,
        node.id,
        "Add an active WhatsApp option or change this step to a text/image reply.",
      ),
    );
  }
  for (const option of options) {
    if (!option.label?.en?.trim()) {
      diagnostics.push(
        warning(
          "CHOICE_LABEL_MISSING",
          `${nodeName(node)} has an option without an English label.`,
          node.id,
          "Add the button text customers should see.",
        ),
      );
    }
  }
}

function validateChoicePublish(
  document: CanonicalFlowDocument,
  node: CanonicalFlowNode,
  diagnostics: FlowDiagnostic[],
) {
  const options = activeOptions(node);
  if (!options.length) {
    diagnostics.push(
      error(
        "PUBLISH_CHOICE_OPTIONS_MISSING",
        `${nodeName(node)} needs at least one active option.`,
        node.id,
        undefined,
        "Add an active WhatsApp option or change this step to a text/image reply.",
      ),
    );
  }
  if (options.length > WHATSAPP_MAX_BUTTONS) {
    diagnostics.push(
      error(
        "PUBLISH_WHATSAPP_BUTTON_LIMIT",
        `${nodeName(node)} has ${options.length} active options. WhatsApp supports ${WHATSAPP_MAX_BUTTONS}.`,
        node.id,
        undefined,
        "Deactivate or remove extra options so only three active WhatsApp buttons remain.",
      ),
    );
  }
  const labels = new Set<string>();
  for (const option of options) {
    const label = option.label?.en?.trim();
    if (!label) {
      diagnostics.push(
        error(
          "PUBLISH_CHOICE_LABEL_MISSING",
          `${nodeName(node)} has an option without an English label.`,
          node.id,
          undefined,
          "Add the button text customers should see.",
        ),
      );
    } else {
      const key = label.toLowerCase();
      if (labels.has(key)) {
        diagnostics.push(
          error(
            "PUBLISH_CHOICE_LABEL_DUPLICATE",
            `${nodeName(node)} has duplicate option label ${label}.`,
            node.id,
            undefined,
            "Rename one of the duplicated active options.",
          ),
        );
      }
      labels.add(key);
      if (label.length > WHATSAPP_BUTTON_TITLE_MAX) {
        diagnostics.push(
          error(
            "PUBLISH_CHOICE_LABEL_TOO_LONG",
            `${label} is too long for a WhatsApp button.`,
            node.id,
            undefined,
            `Shorten this button to ${WHATSAPP_BUTTON_TITLE_MAX} characters or fewer.`,
          ),
        );
      }
    }
    const key = option.key?.trim();
    if (key && !outgoing(document.edges, node.id).some((edge) => edge.condition === key)) {
      diagnostics.push(
        error(
          "PUBLISH_CHOICE_TARGET_MISSING",
          `${nodeName(node)} option ${key} needs a target.`,
          node.id,
          undefined,
          "Choose what should happen after the customer taps this option.",
        ),
      );
    }
  }
}

function validateImageDraft(node: CanonicalFlowNode, diagnostics: FlowDiagnostic[]) {
  const imageUrl = imageUrlForNode(node);
  if (!imageUrl) {
    diagnostics.push(
      warning(
        "IMAGE_URL_MISSING",
        `${nodeName(node)} needs an image URL.`,
        node.id,
        "Upload an image or paste a public image URL.",
      ),
    );
  } else if (!isHttpUrl(imageUrl)) {
    diagnostics.push(
      warning(
        "IMAGE_URL_INVALID",
        `${nodeName(node)} image URL must start with http:// or https://.`,
        node.id,
        "Upload the image through the admin tool or use a public HTTPS URL.",
      ),
    );
  }
}

function validateImagePublish(node: CanonicalFlowNode, diagnostics: FlowDiagnostic[]) {
  const imageUrl = imageUrlForNode(node);
  if (!imageUrl) {
    diagnostics.push(
      error(
        "PUBLISH_IMAGE_URL_MISSING",
        `${nodeName(node)} needs an image URL.`,
        node.id,
        undefined,
        "Upload an image or paste a public image URL.",
      ),
    );
    return;
  }
  if (!isHttpUrl(imageUrl)) {
    diagnostics.push(
      error(
        "PUBLISH_IMAGE_URL_INVALID",
        `${nodeName(node)} image URL must start with http:// or https://.`,
        node.id,
        undefined,
        "Upload the image through the admin tool or use a public HTTPS URL.",
      ),
    );
  }
}

function detectGuaranteedAutomaticCycle(
  document: CanonicalFlowDocument,
  diagnostics: FlowDiagnostic[],
) {
  const nodeById = new Map(document.nodes.map((node) => [node.id, node]));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(nodeId: string): boolean {
    const node = nodeById.get(nodeId);
    if (!node || !AUTO_TRANSITION_TYPES.has(node.type)) return false;
    if (visiting.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    visiting.add(nodeId);
    for (const edge of outgoing(document.edges, nodeId)) {
      if (visit(edge.to)) return true;
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  }

  if (document.startNodeId && visit(document.startNodeId)) {
    diagnostics.push(
      error(
        "PUBLISH_AUTOMATIC_CYCLE",
        "This flow can loop through automatic message steps without waiting for customer input.",
        undefined,
        undefined,
        "Insert a customer choice step or end the conversation before the loop repeats.",
      ),
    );
  }
}

function getReachableNodes(document: CanonicalFlowDocument) {
  const reachable = new Set<string>();
  if (!document.startNodeId) return reachable;
  const nodeIds = new Set(document.nodes.map((node) => node.id));
  const queue = [document.startNodeId];
  while (queue.length) {
    const current = queue.shift();
    if (!current || reachable.has(current) || !nodeIds.has(current)) continue;
    reachable.add(current);
    for (const edge of outgoing(document.edges, current)) queue.push(edge.to);
  }
  return reachable;
}

function outgoing(edges: CanonicalFlowEdge[], nodeId: string) {
  return edges.filter((edge) => edge.from === nodeId);
}

function activeOptions(node: CanonicalFlowNode) {
  return (node.options ?? []).filter((option) => option.active !== false);
}

function nodeName(node: CanonicalFlowNode) {
  return node.title?.trim() || node.labels?.en?.trim() || node.messages?.en?.trim() || node.id;
}

function isMessageLike(node: CanonicalFlowNode) {
  return node.type === "MESSAGE" || node.type === "MAIN_MENU" || node.type === "HUMAN_HANDOFF";
}

function messageText(node: CanonicalFlowNode) {
  return node.messages?.en?.trim() || node.messages?.ar?.trim() || node.labels?.en?.trim();
}

function isExecutableTerminal(node: CanonicalFlowNode) {
  return node.type === "MESSAGE" || node.type === "IMAGE_MESSAGE" || TERMINAL_TYPES.has(node.type) || WAIT_FOR_INPUT_TYPES.has(node.type);
}

function imageUrlForNode(node: CanonicalFlowNode) {
  return typeof node.mediaUrl === "string" ? node.mediaUrl.trim() : "";
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function error(
  code: string,
  message: string,
  nodeId?: string,
  edgeId?: string,
  suggestedFix?: string,
): FlowDiagnostic {
  return { code, message, severity: "error", phase: "structural", nodeId, edgeId, suggestedFix };
}

function warning(
  code: string,
  message: string,
  nodeId?: string,
  suggestedFix?: string,
): FlowDiagnostic {
  return { code, message, severity: "warning", phase: "draft", nodeId, suggestedFix };
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
