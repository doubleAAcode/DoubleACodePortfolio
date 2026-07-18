import {
  invalidRequest,
  parseInboxBusinessId,
  parseInboxIdempotencyKey,
  parseInboxUuid,
  type InboxConversationStatus,
} from "./inbox-query.ts";

export type ConversationActorKind = "INTERNAL_ADMIN" | "BUSINESS_USER";

export type ConversationLifecycleCommand = {
  conversationId: string;
  businessId?: string;
  status: InboxConversationStatus;
  snoozedUntil?: string;
  idempotencyKey: string;
  actorKind: ConversationActorKind;
  actorUsername: string;
};

export type ConversationLifecycleResult = {
  conversationId: string;
  businessId: string;
  previousStatus: InboxConversationStatus;
  status: InboxConversationStatus;
  snoozedUntil: string | null;
  applied: boolean;
  duplicate: boolean;
  eventId: string | null;
};

export type ConversationOperationsService = {
  changeLifecycle(command: ConversationLifecycleCommand): Promise<ConversationLifecycleResult>;
};

export type ConversationLifecycleProcessor = {
  processDue(input?: { limit?: number }): Promise<{ awakened: number }>;
};

export class ConversationOperationsError extends Error {
  readonly code: "IDEMPOTENCY_CONFLICT" | "ACTIVE_CONVERSATION_EXISTS" | "CONVERSATION_CLOSED";
  readonly status = 409 as const;

  constructor(code: ConversationOperationsError["code"], message: string) {
    super(message);
    this.name = "ConversationOperationsError";
    this.code = code;
  }
}

export function parseConversationLifecycleRequest(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw invalidRequest("A JSON request body is required.");
  }
  const body = value as Record<string, unknown>;
  const status = parseLifecycleStatus(body.status);
  const snoozedUntil = parseSnoozedUntil(body.snoozedUntil, status);
  return {
    status,
    idempotencyKey: parseInboxIdempotencyKey(body.idempotencyKey),
    ...(snoozedUntil ? { snoozedUntil } : {}),
  };
}

export function parseConversationLifecycleProcessorRequest(value: unknown) {
  if (value == null) return { limit: 50 };
  if (typeof value !== "object" || Array.isArray(value)) {
    throw invalidRequest("A JSON object is required.");
  }
  const rawLimit = (value as Record<string, unknown>).limit;
  if (rawLimit == null || rawLimit === "") return { limit: 50 };
  const limit = typeof rawLimit === "number" ? rawLimit : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw invalidRequest("limit must be an integer between 1 and 100.");
  }
  return { limit };
}

export function normalizeConversationLifecycleCommand(command: ConversationLifecycleCommand) {
  const actorUsername = command.actorUsername.trim();
  if (!actorUsername || actorUsername.length > 320) {
    throw invalidRequest("The authenticated actor is invalid.");
  }
  if (command.actorKind !== "INTERNAL_ADMIN" && command.actorKind !== "BUSINESS_USER") {
    throw invalidRequest("The authenticated actor type is invalid.");
  }
  const status = parseLifecycleStatus(command.status);
  const snoozedUntil = parseSnoozedUntil(command.snoozedUntil, status);
  return {
    conversationId: parseInboxUuid(command.conversationId, "conversationId"),
    businessId: command.businessId ? parseInboxBusinessId(command.businessId) : undefined,
    status,
    idempotencyKey: parseInboxIdempotencyKey(command.idempotencyKey),
    actorKind: command.actorKind,
    actorUsername,
    ...(snoozedUntil ? { snoozedUntil } : {}),
  };
}

function parseLifecycleStatus(value: unknown): InboxConversationStatus {
  if (value === "OPEN" || value === "PENDING" || value === "SNOOZED" || value === "CLOSED") {
    return value;
  }
  throw invalidRequest("status must be OPEN, PENDING, SNOOZED, or CLOSED.");
}

function parseSnoozedUntil(value: unknown, status: InboxConversationStatus) {
  if (status !== "SNOOZED") {
    if (value != null && value !== "") {
      throw invalidRequest("snoozedUntil is only valid when status is SNOOZED.");
    }
    return undefined;
  }
  if (typeof value !== "string" || !value.trim()) {
    throw invalidRequest("snoozedUntil is required when status is SNOOZED.");
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw invalidRequest("snoozedUntil is invalid.");
  return parsed.toISOString();
}
