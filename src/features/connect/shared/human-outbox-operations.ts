import { invalidRequest, parseInboxBusinessId, parseInboxUuid } from "./inbox-query.ts";

export type HumanRetryProcessorSummary = {
  sendEnabled: boolean;
  quarantined: number;
  candidates: number;
  claimed: number;
  sent: number;
  retryable: number;
  failed: number;
  blocked: number;
  exhausted: number;
  reconciliationRequired: number;
  completionUncertain: number;
};

export type HumanReconciliationResolution = "CONFIRM_SENT" | "CONFIRM_FAILED" | "RETRY";

export type HumanReconciliationItem = {
  outboxId: string;
  messageId: string | null;
  businessId: string;
  conversationId: string;
  body: string;
  attemptNumber: number;
  errorCode: string | null;
  errorMessage: string | null;
  serviceWindowExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HumanReconciliationResult = {
  outboxId: string;
  messageId: string | null;
  status: string;
  attemptNumber: number;
  nextAttemptAt: string | null;
};

export type HumanOutboxProcessor = {
  processDueReplies(input?: { limit?: number }): Promise<HumanRetryProcessorSummary>;
};

export type HumanReconciliationService = {
  listRequired(input?: { limit?: number }): Promise<HumanReconciliationItem[]>;
  resolve(input: {
    businessId: string;
    outboxId: string;
    resolution: HumanReconciliationResolution;
    resolvedByUsername: string;
    metaMessageId?: string;
    note?: string;
  }): Promise<HumanReconciliationResult>;
};

export function parseHumanProcessorRequest(value: unknown) {
  if (value == null) return { limit: 10 };
  if (typeof value !== "object" || Array.isArray(value)) {
    throw invalidRequest("A JSON object is required.");
  }
  return { limit: parseHumanOperationLimit((value as Record<string, unknown>).limit, 10) };
}

export function parseHumanReconciliationRequest(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw invalidRequest("A JSON request body is required.");
  }
  const body = value as Record<string, unknown>;
  const resolution = body.resolution;
  if (resolution !== "CONFIRM_SENT" && resolution !== "CONFIRM_FAILED" && resolution !== "RETRY") {
    throw invalidRequest("resolution is invalid.");
  }
  const metaMessageId = parseOptionalText(body.metaMessageId, "metaMessageId", 300);
  if (resolution === "CONFIRM_SENT" && !metaMessageId) {
    throw invalidRequest("metaMessageId is required when confirming a send.");
  }
  if (typeof body.businessId !== "string") throw invalidRequest("businessId is required.");
  if (typeof body.outboxId !== "string") throw invalidRequest("outboxId is required.");
  const note = parseOptionalText(body.note, "note", 1000);
  return {
    businessId: parseInboxBusinessId(body.businessId),
    outboxId: parseInboxUuid(body.outboxId, "outboxId"),
    resolution: resolution as HumanReconciliationResolution,
    ...(metaMessageId ? { metaMessageId } : {}),
    ...(note ? { note } : {}),
  };
}

export function parseHumanOperationLimit(value: unknown, fallback = 20) {
  if (value == null || value === "") return fallback;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
    throw invalidRequest("limit must be an integer between 1 and 50.");
  }
  return parsed;
}

function parseOptionalText(value: unknown, name: string, maximumLength: number) {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") throw invalidRequest(`${name} must be text.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maximumLength) {
    throw invalidRequest(`${name} is invalid.`);
  }
  return normalized;
}
