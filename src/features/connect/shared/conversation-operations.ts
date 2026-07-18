import {
  invalidRequest,
  parseInboxBusinessId,
  parseInboxIdempotencyKey,
  parseInboxUuid,
  type InboxConversationPriority,
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

export type ConversationCollaborationOperation =
  | "SET_PRIORITY"
  | "ASSIGN"
  | "UNASSIGN"
  | "MARK_READ"
  | "MARK_UNREAD";

export type ConversationCollaborationCommand = {
  conversationId: string;
  businessId?: string;
  operation: ConversationCollaborationOperation;
  priority?: InboxConversationPriority;
  assigneeUserId?: string;
  unread?: boolean;
  idempotencyKey: string;
  actorKind: ConversationActorKind;
  actorUsername: string;
};

export type ConversationCollaborationResult = {
  conversationId: string;
  businessId: string;
  operation: ConversationCollaborationOperation;
  priority: InboxConversationPriority;
  assigneeUserId: string | null;
  unreadCount: number;
  applied: boolean;
  duplicate: boolean;
  eventId: string | null;
};

export type ConversationNoteCommand = {
  conversationId: string;
  businessId?: string;
  note: string;
  idempotencyKey: string;
  actorKind: ConversationActorKind;
  actorUsername: string;
};

export type ConversationTagCommand = {
  conversationId: string;
  businessId?: string;
  tagId: string;
  operation: "ADD" | "REMOVE";
  idempotencyKey: string;
  actorKind: ConversationActorKind;
  actorUsername: string;
};

export type ConversationAuditResult = {
  conversationId: string;
  businessId: string;
  applied: boolean;
  duplicate: boolean;
  eventId: string | null;
};

export type ConversationTagResult = ConversationAuditResult & { tagId: string };

export type ConversationCollaborationService = {
  changeCollaboration(
    command: ConversationCollaborationCommand,
  ): Promise<ConversationCollaborationResult>;
  addNote(command: ConversationNoteCommand): Promise<ConversationAuditResult>;
  changeTag(command: ConversationTagCommand): Promise<ConversationTagResult>;
};

export type ConversationCommandService = ConversationOperationsService &
  ConversationCollaborationService;

export type ConversationLifecycleProcessor = {
  processDue(input?: { limit?: number }): Promise<{ awakened: number }>;
};

export class ConversationOperationsError extends Error {
  readonly code:
    | "IDEMPOTENCY_CONFLICT"
    | "ACTIVE_CONVERSATION_EXISTS"
    | "CONVERSATION_CLOSED"
    | "ASSIGNEE_NOT_AVAILABLE"
    | "TAG_NOT_FOUND";
  readonly status: 404 | 409;

  constructor(code: ConversationOperationsError["code"], message: string, status: 404 | 409 = 409) {
    super(message);
    this.name = "ConversationOperationsError";
    this.code = code;
    this.status = status;
  }
}

export type ParsedConversationCommand =
  | ({ kind: "lifecycle" } & ReturnType<typeof parseConversationLifecycleRequest>)
  | {
      kind: "collaboration";
      operation: ConversationCollaborationOperation;
      priority?: InboxConversationPriority;
      assigneeUserId?: string;
      unread?: boolean;
      idempotencyKey: string;
    };

export function parseConversationCommandRequest(value: unknown): ParsedConversationCommand {
  const body = parseObject(value);
  const commandFields = ["status", "priority", "assigneeUserId", "unread"].filter((field) =>
    Object.prototype.hasOwnProperty.call(body, field),
  );
  if (commandFields.length !== 1) {
    throw invalidRequest("Provide exactly one of status, priority, assigneeUserId, or unread.");
  }

  const idempotencyKey = parseInboxIdempotencyKey(body.idempotencyKey);
  if (commandFields[0] === "status") {
    return { kind: "lifecycle", ...parseConversationLifecycleRequest(body) };
  }
  if (commandFields[0] === "priority") {
    return {
      kind: "collaboration",
      operation: "SET_PRIORITY",
      priority: parseConversationPriority(body.priority),
      idempotencyKey,
    };
  }
  if (commandFields[0] === "assigneeUserId") {
    if (body.assigneeUserId == null || body.assigneeUserId === "") {
      return { kind: "collaboration", operation: "UNASSIGN", idempotencyKey };
    }
    if (typeof body.assigneeUserId !== "string") {
      throw invalidRequest("assigneeUserId must be a UUID or null.");
    }
    return {
      kind: "collaboration",
      operation: "ASSIGN",
      assigneeUserId: parseInboxUuid(body.assigneeUserId, "assigneeUserId"),
      idempotencyKey,
    };
  }
  if (typeof body.unread !== "boolean") throw invalidRequest("unread must be a boolean.");
  return {
    kind: "collaboration",
    operation: body.unread ? "MARK_UNREAD" : "MARK_READ",
    unread: body.unread,
    idempotencyKey,
  };
}

export function parseConversationNoteRequest(value: unknown) {
  const body = parseObject(value);
  if (typeof body.note !== "string" || !body.note.trim() || body.note.trim().length > 4000) {
    throw invalidRequest("note must be between 1 and 4000 characters.");
  }
  return {
    note: body.note.trim(),
    idempotencyKey: parseInboxIdempotencyKey(body.idempotencyKey),
  };
}

export function parseConversationTagRequest(value: unknown) {
  const body = parseObject(value);
  return { idempotencyKey: parseInboxIdempotencyKey(body.idempotencyKey) };
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

export function normalizeConversationCollaborationCommand(
  command: ConversationCollaborationCommand,
) {
  const actor = normalizeActor(command);
  if (
    command.operation !== "SET_PRIORITY" &&
    command.operation !== "ASSIGN" &&
    command.operation !== "UNASSIGN" &&
    command.operation !== "MARK_READ" &&
    command.operation !== "MARK_UNREAD"
  ) {
    throw invalidRequest("The collaboration operation is invalid.");
  }
  if (command.operation === "SET_PRIORITY" && !command.priority) {
    throw invalidRequest("priority is required.");
  }
  if (command.operation === "ASSIGN" && !command.assigneeUserId) {
    throw invalidRequest("assigneeUserId is required.");
  }
  return {
    ...actor,
    operation: command.operation,
    ...(command.priority ? { priority: parseConversationPriority(command.priority) } : {}),
    ...(command.assigneeUserId
      ? { assigneeUserId: parseInboxUuid(command.assigneeUserId, "assigneeUserId") }
      : {}),
    ...(command.unread != null ? { unread: command.unread } : {}),
  };
}

export function normalizeConversationNoteCommand(command: ConversationNoteCommand) {
  const actor = normalizeActor(command);
  const note = command.note.trim();
  if (!note || note.length > 4000) {
    throw invalidRequest("note must be between 1 and 4000 characters.");
  }
  return { ...actor, note };
}

export function normalizeConversationTagCommand(command: ConversationTagCommand) {
  const actor = normalizeActor(command);
  if (command.operation !== "ADD" && command.operation !== "REMOVE") {
    throw invalidRequest("The tag operation is invalid.");
  }
  return {
    ...actor,
    tagId: parseInboxUuid(command.tagId, "tagId"),
    operation: command.operation,
  };
}

function normalizeActor(command: {
  conversationId: string;
  businessId?: string;
  idempotencyKey: string;
  actorKind: ConversationActorKind;
  actorUsername: string;
}) {
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
    idempotencyKey: parseInboxIdempotencyKey(command.idempotencyKey),
    actorKind: command.actorKind,
    actorUsername,
  };
}

function parseLifecycleStatus(value: unknown): InboxConversationStatus {
  if (value === "OPEN" || value === "PENDING" || value === "SNOOZED" || value === "CLOSED") {
    return value;
  }
  throw invalidRequest("status must be OPEN, PENDING, SNOOZED, or CLOSED.");
}

function parseConversationPriority(value: unknown): InboxConversationPriority {
  if (value === "LOW" || value === "NORMAL" || value === "HIGH" || value === "URGENT") {
    return value;
  }
  throw invalidRequest("priority must be LOW, NORMAL, HIGH, or URGENT.");
}

function parseObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw invalidRequest("A JSON request body is required.");
  }
  return value as Record<string, unknown>;
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
