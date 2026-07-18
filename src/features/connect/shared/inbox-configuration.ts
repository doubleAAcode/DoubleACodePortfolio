import {
  invalidRequest,
  parseInboxBusinessId,
  parseInboxIdempotencyKey,
  parseInboxUuid,
} from "./inbox-query.ts";
import type { ConversationActorKind } from "./conversation-operations.ts";

export type InboxAssigneeOption = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
};

export type InboxTagOption = { id: string; name: string; color: string };

export type InboxCannedReply = {
  id: string;
  businessId: string;
  title: string;
  body: string;
  shortcut: string | null;
  category: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InboxConfigurationOptions = {
  businessId: string;
  assignees: InboxAssigneeOption[];
  tags: InboxTagOption[];
  cannedReplies: InboxCannedReply[];
};

export type CannedReplySaveCommand = {
  businessId: string;
  operation: "CREATE" | "UPDATE" | "ARCHIVE";
  replyId?: string;
  title?: string;
  body?: string;
  shortcut?: string;
  category?: string;
  idempotencyKey: string;
  actorKind: ConversationActorKind;
  actorUsername: string;
};

export type CannedReplySaveResult = {
  reply: InboxCannedReply;
  applied: boolean;
  duplicate: boolean;
  auditEventId: string | null;
};

export type InboxConfigurationService = {
  getOptions(businessId: string): Promise<InboxConfigurationOptions>;
  listCannedReplies(businessId: string, includeInactive?: boolean): Promise<InboxCannedReply[]>;
  saveCannedReply(command: CannedReplySaveCommand): Promise<CannedReplySaveResult>;
};

export class InboxConfigurationError extends Error {
  readonly code: "CANNED_REPLY_NOT_FOUND" | "SHORTCUT_CONFLICT" | "IDEMPOTENCY_CONFLICT";
  readonly status: 404 | 409;

  constructor(code: InboxConfigurationError["code"], message: string, status: 404 | 409) {
    super(message);
    this.name = "InboxConfigurationError";
    this.code = code;
    this.status = status;
  }
}

export function parseCannedReplyWriteRequest(value: unknown) {
  const body = parseObject(value);
  if (typeof body.title !== "string" || !body.title.trim() || body.title.trim().length > 120) {
    throw invalidRequest("title must be between 1 and 120 characters.");
  }
  if (typeof body.body !== "string" || !body.body.trim() || body.body.trim().length > 4000) {
    throw invalidRequest("body must be between 1 and 4000 characters.");
  }
  return {
    title: body.title.trim(),
    body: body.body.trim(),
    shortcut: parseOptionalText(body.shortcut, "shortcut", 64),
    category: parseOptionalText(body.category, "category", 80),
    idempotencyKey: parseInboxIdempotencyKey(body.idempotencyKey),
  };
}

export function parseCannedReplyArchiveRequest(value: unknown) {
  const body = parseObject(value);
  return { idempotencyKey: parseInboxIdempotencyKey(body.idempotencyKey) };
}

export function normalizeCannedReplySaveCommand(command: CannedReplySaveCommand) {
  const actorUsername = command.actorUsername.trim();
  if (!actorUsername || actorUsername.length > 320) throw invalidRequest("The actor is invalid.");
  if (command.actorKind !== "INTERNAL_ADMIN" && command.actorKind !== "BUSINESS_USER") {
    throw invalidRequest("The actor type is invalid.");
  }
  if (
    command.operation !== "CREATE" &&
    command.operation !== "UPDATE" &&
    command.operation !== "ARCHIVE"
  ) {
    throw invalidRequest("The canned reply operation is invalid.");
  }
  if (command.operation !== "CREATE" && !command.replyId) {
    throw invalidRequest("replyId is required.");
  }
  if (command.operation !== "ARCHIVE" && (!command.title || !command.body)) {
    throw invalidRequest("title and body are required.");
  }
  return {
    businessId: parseInboxBusinessId(command.businessId),
    operation: command.operation,
    ...(command.replyId ? { replyId: parseInboxUuid(command.replyId, "replyId") } : {}),
    ...(command.title ? { title: command.title.trim() } : {}),
    ...(command.body ? { body: command.body.trim() } : {}),
    ...(command.shortcut ? { shortcut: command.shortcut.trim() } : {}),
    ...(command.category ? { category: command.category.trim() } : {}),
    idempotencyKey: parseInboxIdempotencyKey(command.idempotencyKey),
    actorKind: command.actorKind,
    actorUsername,
  };
}

function parseObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw invalidRequest("A JSON request body is required.");
  }
  return value as Record<string, unknown>;
}

function parseOptionalText(value: unknown, field: string, maxLength: number) {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw invalidRequest(`${field} must be between 1 and ${maxLength} characters.`);
  }
  return value.trim();
}
