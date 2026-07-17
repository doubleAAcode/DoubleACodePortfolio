import { invalidRequest, parseInboxBusinessId, parseInboxUuid } from "./inbox-query.ts";

export type HumanActorKind = "INTERNAL_ADMIN" | "BUSINESS_USER";
export type HumanReplyStatus = "SENDING" | "SENT" | "RETRYABLE" | "FAILED" | "CANCELLED";

export type HumanTextReplyCommand = {
  conversationId: string;
  businessId?: string;
  idempotencyKey: string;
  body: string;
  actorKind: HumanActorKind;
  actorUsername: string;
};

export type HumanTextReplyResult = {
  outboxId: string;
  messageId: string | null;
  status: HumanReplyStatus;
  attemptNumber: number;
  duplicate: boolean;
  retryable: boolean;
  serviceWindowExpiresAt: string;
  errorCode?: string;
};

export type HumanOperationsService = {
  sendTextReply(command: HumanTextReplyCommand): Promise<HumanTextReplyResult>;
};

export class HumanOperationsError extends Error {
  readonly code:
    | "INVALID_REQUEST"
    | "NOT_FOUND"
    | "CONVERSATION_CLOSED"
    | "IDEMPOTENCY_CONFLICT"
    | "TEMPLATE_REQUIRED"
    | "HUMAN_SEND_DISABLED"
    | "PROVIDER_FAILURE"
    | "INTERNAL_ERROR";
  readonly status: 400 | 404 | 409 | 502 | 503;

  constructor(
    code: HumanOperationsError["code"],
    message: string,
    status: HumanOperationsError["status"],
  ) {
    super(message);
    this.name = "HumanOperationsError";
    this.code = code;
    this.status = status;
  }
}

export function parseHumanTextReplyRequest(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw invalidRequest("A JSON request body is required.");
  }
  const body = value as Record<string, unknown>;
  return {
    idempotencyKey: parseIdempotencyKey(body.idempotencyKey),
    body: parseReplyBody(body.body),
  };
}

export function normalizeHumanTextReplyCommand(command: HumanTextReplyCommand) {
  const actorUsername = command.actorUsername.trim();
  if (!actorUsername || actorUsername.length > 320) {
    throw invalidRequest("The authenticated actor is invalid.");
  }
  if (command.actorKind !== "INTERNAL_ADMIN" && command.actorKind !== "BUSINESS_USER") {
    throw invalidRequest("The authenticated actor type is invalid.");
  }
  return {
    conversationId: parseInboxUuid(command.conversationId, "conversationId"),
    businessId: command.businessId ? parseInboxBusinessId(command.businessId) : undefined,
    idempotencyKey: parseIdempotencyKey(command.idempotencyKey),
    body: parseReplyBody(command.body),
    actorKind: command.actorKind,
    actorUsername,
  };
}

function parseIdempotencyKey(value: unknown) {
  if (typeof value !== "string") throw invalidRequest("idempotencyKey is required.");
  const normalized = value.trim();
  if (
    normalized.length < 8 ||
    normalized.length > 200 ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(normalized)
  ) {
    throw invalidRequest("idempotencyKey is invalid.");
  }
  return normalized;
}

function parseReplyBody(value: unknown) {
  if (typeof value !== "string") throw invalidRequest("body is required.");
  const normalized = value.trim();
  if (!normalized) throw invalidRequest("body cannot be empty.");
  if (normalized.length > 4096) throw invalidRequest("body must be 4096 characters or less.");
  return normalized;
}
