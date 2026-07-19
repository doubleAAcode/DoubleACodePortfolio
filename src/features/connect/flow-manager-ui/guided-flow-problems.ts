import type { CanonicalFlowDocument } from "../shared/flow-document.ts";
import {
  flowDiagnosticsToLegacyResult,
  validateFlow,
  type FlowDiagnostic,
} from "../shared/flow-validation.ts";
import type { FlowValidationIssue } from "../shared/flow-template-types.ts";

export type GuidedProblemControl =
  | "map"
  | "message"
  | "choices"
  | "destination"
  | "media"
  | "behavior"
  | "advanced";

const familyByCode: Record<string, string> = {
  EMPTY_MESSAGE: "message-empty",
  PUBLISH_MESSAGE_EMPTY: "message-empty",
  IMAGE_URL_MISSING: "image-url",
  PUBLISH_IMAGE_URL_MISSING: "image-url",
  IMAGE_URL_INVALID: "image-url-invalid",
  PUBLISH_IMAGE_URL_INVALID: "image-url-invalid",
  CHOICE_OPTIONS_MISSING: "choice-options",
  PUBLISH_CHOICE_OPTIONS_MISSING: "choice-options",
  CHOICE_LABEL_MISSING: "choice-label-missing",
  PUBLISH_CHOICE_LABEL_MISSING: "choice-label-missing",
  CHOICE_LABEL_DUPLICATE: "choice-label-duplicate",
  PUBLISH_CHOICE_LABEL_DUPLICATE: "choice-label-duplicate",
  CHOICE_LABEL_TOO_LONG: "choice-label-long",
  PUBLISH_CHOICE_LABEL_TOO_LONG: "choice-label-long",
  CHOICE_ARABIC_LABEL_TOO_LONG: "choice-label-ar-long",
  PUBLISH_CHOICE_ARABIC_LABEL_TOO_LONG: "choice-label-ar-long",
  CHOICE_KEY_MISSING: "choice-key-missing",
  PUBLISH_CHOICE_KEY_MISSING: "choice-key-missing",
  CHOICE_KEY_DUPLICATE: "choice-key-duplicate",
  PUBLISH_CHOICE_KEY_DUPLICATE: "choice-key-duplicate",
  CHOICE_TARGET_MISSING: "choice-target-missing",
  PUBLISH_CHOICE_TARGET_MISSING: "choice-target-missing",
  CHOICE_TARGET_INVALID: "choice-target-invalid",
  PUBLISH_CHOICE_TARGET_INVALID: "choice-target-invalid",
  CHOICE_EDGE_MISSING: "choice-edge-missing",
  PUBLISH_CHOICE_EDGE_MISSING: "choice-edge-missing",
  CHOICE_EDGE_DUPLICATE: "choice-edge-duplicate",
  PUBLISH_CHOICE_EDGE_DUPLICATE: "choice-edge-duplicate",
  CHOICE_EDGE_TARGET_MISMATCH: "choice-edge-mismatch",
  PUBLISH_CHOICE_EDGE_TARGET_MISMATCH: "choice-edge-mismatch",
  WHATSAPP_BUTTON_LIMIT: "choice-limit",
  PUBLISH_WHATSAPP_BUTTON_LIMIT: "choice-limit",
  DEAD_END: "dead-end",
  PUBLISH_DEAD_END: "dead-end",
  TERMINAL_CONTINUES: "terminal-continues",
  PUBLISH_TERMINAL_CONTINUES: "terminal-continues",
  AUTOMATIC_ROUTE_AMBIGUOUS: "automatic-route",
  PUBLISH_AUTOMATIC_ROUTE_AMBIGUOUS: "automatic-route",
  CONDITION_UNSUPPORTED: "condition-unsupported",
  CONDITION_UNSUPPORTED_FOR_PUBLISH: "condition-unsupported",
  START_MISSING: "start-missing",
  PUBLISH_START_REQUIRED: "start-missing",
  START_TARGET_MISSING: "start-target-missing",
  PUBLISH_START_MISSING: "start-target-missing",
};

export function createGuidedFlowProblems(document: CanonicalFlowDocument): FlowValidationIssue[] {
  const diagnostics = validateFlow(document, { mode: "publish" }).diagnostics;
  const deduplicated = new Map<string, FlowDiagnostic>();
  for (const diagnostic of diagnostics) {
    const key = [
      diagnostic.nodeId ?? "flow",
      diagnostic.edgeId ?? "",
      diagnostic.path ?? "",
      familyByCode[diagnostic.code] ?? diagnostic.code,
    ].join("|");
    const current = deduplicated.get(key);
    if (!current || (current.severity === "warning" && diagnostic.severity === "error")) {
      deduplicated.set(key, diagnostic);
    }
  }

  const nodeIndex = new Map(document.nodes.map((node, index) => [node.id, index]));
  const ordered = [...deduplicated.values()].sort((left, right) => {
    const severity = severityRank(left) - severityRank(right);
    if (severity) return severity;
    const node =
      (left.nodeId ? (nodeIndex.get(left.nodeId) ?? Number.MAX_SAFE_INTEGER) : -1) -
      (right.nodeId ? (nodeIndex.get(right.nodeId) ?? Number.MAX_SAFE_INTEGER) : -1);
    if (node) return node;
    const control =
      controlRank(guidedProblemControl(left)) - controlRank(guidedProblemControl(right));
    if (control) return control;
    return `${left.code}:${left.path ?? ""}`.localeCompare(`${right.code}:${right.path ?? ""}`);
  });
  return flowDiagnosticsToLegacyResult(ordered).issues;
}

export function guidedProblemControl(
  issue: Pick<FlowValidationIssue, "code" | "nodeId" | "edgeId" | "path">,
): GuidedProblemControl {
  const code = issue.code;
  if (code.includes("UNREACHABLE")) return "map";
  if (code.includes("MESSAGE")) return "message";
  if (code.includes("IMAGE") || code.includes("MEDIA") || code.includes("TEMPLATE")) {
    return "media";
  }
  if (code.includes("TARGET") || code.includes("EDGE") || code.includes("ROUTE")) {
    return issue.nodeId ? "destination" : "advanced";
  }
  if (code.includes("DEAD_END") || code.includes("TERMINAL")) return "destination";
  if (code.includes("CHOICE") || code.includes("BUTTON") || issue.path?.startsWith("options.")) {
    return "choices";
  }
  if (code.includes("START")) {
    return code.includes("TARGET") || code === "PUBLISH_START_MISSING" ? "advanced" : "map";
  }
  if (code.includes("TYPE") || code.includes("CONDITION") || code.includes("OPTIONAL")) {
    return "behavior";
  }
  return issue.nodeId ? "behavior" : "advanced";
}

export function guidedProblemActionLabel(control: GuidedProblemControl) {
  switch (control) {
    case "map":
      return "Show on map";
    case "message":
      return "Fix message";
    case "choices":
      return "Fix choices";
    case "destination":
      return "Fix route";
    case "media":
      return "Fix media";
    case "behavior":
      return "Review step";
    case "advanced":
      return "Inspect flow";
  }
}

function severityRank(diagnostic: FlowDiagnostic) {
  return diagnostic.severity === "error" ? 0 : 1;
}

function controlRank(control: GuidedProblemControl) {
  return ["map", "message", "choices", "destination", "media", "behavior", "advanced"].indexOf(
    control,
  );
}
