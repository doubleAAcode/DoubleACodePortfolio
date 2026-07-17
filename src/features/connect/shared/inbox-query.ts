export const INBOX_DEFAULT_PAGE_SIZE = 25;
export const INBOX_MAX_PAGE_SIZE = 100;

export type InboxConversationStatus = "OPEN" | "PENDING" | "SNOOZED" | "CLOSED";
export type InboxConversationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type InboxContactLifecycle = "LEAD" | "CUSTOMER" | "VIP" | "CHURNED";
export type InboxOptInStatus = "UNKNOWN" | "OPTED_IN" | "OPTED_OUT";
export type InboxAssigneeFilter = string | "unassigned";

export type InboxTag = {
  id: string;
  name: string;
  color: string;
};

export type InboxBusinessReference = {
  id: string;
  name: string;
};

export type InboxUserReference = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
};

export type InboxContactReference = {
  id: string;
  phoneE164: string;
  displayName: string;
  lifecycle: InboxContactLifecycle;
  language: string | null;
  optInStatus: InboxOptInStatus;
  firstSeenAt: string;
  lastSeenAt: string;
  tags: InboxTag[];
};

export type InboxConversationSummary = {
  id: string;
  business: InboxBusinessReference;
  contact: InboxContactReference;
  connectionId: string | null;
  channel: "WHATSAPP";
  status: InboxConversationStatus;
  priority: InboxConversationPriority;
  assignee: InboxUserReference | null;
  unreadCount: number;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  lastCustomerMessageAt: string | null;
  lastAgentMessageAt: string | null;
  slaDueAt: string | null;
  snoozedUntil: string | null;
  openedAt: string;
  pendingAt: string | null;
  closedAt: string | null;
  businessFlowId: string | null;
  flowVersionId: string | null;
  currentNodeId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InboxContactSummary = InboxContactReference & {
  business: InboxBusinessReference;
  attributes: Record<string, unknown>;
  optInSource: string | null;
  optInAt: string | null;
  optOutAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InboxMessageTimelineItem = {
  kind: "message";
  id: string;
  createdAt: string;
  direction: "INBOUND" | "OUTBOUND" | "SYSTEM";
  senderType: "CUSTOMER" | "BOT" | "HUMAN" | "SYSTEM";
  senderUserId: string | null;
  messageType: "TEXT" | "IMAGE" | "AUDIO" | "DOCUMENT" | "TEMPLATE" | "INTERACTIVE" | "SYSTEM";
  body: string | null;
  mediaAssetId: string | null;
  templateName: string | null;
  replyToMessageId: string | null;
  status: string;
  errorCode: string | null;
  errorMessage: string | null;
  receivedAt: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
};

export type InboxEventTimelineItem = {
  kind: "event";
  id: string;
  createdAt: string;
  eventType: string;
  actorType: "CUSTOMER" | "USER" | "BOT" | "SYSTEM";
  actorUserId: string | null;
  payload: Record<string, unknown>;
};

export type InboxTimelineItem = InboxMessageTimelineItem | InboxEventTimelineItem;

export type InboxPage<T> = {
  items: T[];
  nextCursor: string | null;
};

export type InboxConversationDetail = {
  conversation: InboxConversationSummary;
  timeline: InboxPage<InboxTimelineItem>;
};

export type InboxContactDetail = {
  contact: InboxContactSummary;
  conversations: InboxPage<InboxConversationSummary>;
};

export type InboxConversationListInput = {
  businessIds?: string[];
  contactId?: string;
  search?: string;
  status?: InboxConversationStatus;
  assignee?: InboxAssigneeFilter;
  unread?: boolean;
  tagId?: string;
  limit?: number;
  cursor?: string;
};

export type InboxContactListInput = {
  businessIds?: string[];
  search?: string;
  lifecycle?: InboxContactLifecycle;
  tagId?: string;
  limit?: number;
  cursor?: string;
};

export type InboxConversationDetailInput = {
  conversationId: string;
  businessIds?: string[];
  timelineLimit?: number;
  timelineCursor?: string;
};

export type InboxContactDetailInput = {
  contactId: string;
  businessIds?: string[];
  conversationLimit?: number;
  conversationCursor?: string;
};

export type InboxQueryService = {
  listConversations(
    input: InboxConversationListInput,
  ): Promise<InboxPage<InboxConversationSummary>>;
  getConversation(input: InboxConversationDetailInput): Promise<InboxConversationDetail>;
  listContacts(input: InboxContactListInput): Promise<InboxPage<InboxContactSummary>>;
  getContact(input: InboxContactDetailInput): Promise<InboxContactDetail>;
};

export class InboxRequestError extends Error {
  readonly code: "INVALID_REQUEST" | "NOT_FOUND";
  readonly status: 400 | 404;

  constructor(code: "INVALID_REQUEST" | "NOT_FOUND", message: string, status: 400 | 404) {
    super(message);
    this.name = "InboxRequestError";
    this.code = code;
    this.status = status;
  }
}

type InboxCursor = {
  version: 1;
  at: string;
  id: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BUSINESS_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,127}$/i;

export function parseInboxPageLimit(value: string | null, fallback = INBOX_DEFAULT_PAGE_SIZE) {
  if (value === null || value === "") return fallback;
  if (!/^\d+$/.test(value)) throw invalidRequest("limit must be a positive integer.");
  const limit = Number(value);
  if (limit < 1 || limit > INBOX_MAX_PAGE_SIZE) {
    throw invalidRequest(`limit must be between 1 and ${INBOX_MAX_PAGE_SIZE}.`);
  }
  return limit;
}

export function parseInboxUuid(value: string, field: string) {
  const normalized = value.trim();
  if (!UUID_PATTERN.test(normalized)) throw invalidRequest(`${field} is invalid.`);
  return normalized.toLowerCase();
}

export function parseInboxBusinessId(value: string, field = "businessId") {
  const normalized = value.trim();
  if (!BUSINESS_ID_PATTERN.test(normalized)) throw invalidRequest(`${field} is invalid.`);
  return normalized;
}

export function parseInboxSearch(value: string | null) {
  const normalized =
    value
      ?.trim()
      .replace(/[%,()*]/g, " ")
      .replace(/\s+/g, " ") || "";
  if (!normalized) return undefined;
  if (normalized.length > 120) throw invalidRequest("search must be 120 characters or less.");
  return normalized;
}

export function parseInboxBoolean(value: string | null, field: string) {
  if (value === null || value === "") return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  throw invalidRequest(`${field} must be true or false.`);
}

export function parseConversationStatus(value: string | null) {
  if (!value) return undefined;
  const normalized = value.toUpperCase();
  if (
    normalized === "OPEN" ||
    normalized === "PENDING" ||
    normalized === "SNOOZED" ||
    normalized === "CLOSED"
  ) {
    return normalized;
  }
  throw invalidRequest("status is invalid.");
}

export function parseContactLifecycle(value: string | null) {
  if (!value) return undefined;
  const normalized = value.toUpperCase();
  if (
    normalized === "LEAD" ||
    normalized === "CUSTOMER" ||
    normalized === "VIP" ||
    normalized === "CHURNED"
  ) {
    return normalized;
  }
  throw invalidRequest("lifecycle is invalid.");
}

export function parseInboxAssignee(value: string | null) {
  if (!value) return undefined;
  if (value === "unassigned") return value;
  return parseInboxUuid(value, "assignee");
}

export function encodeInboxCursor(at: string, id: string) {
  const cursor: InboxCursor = {
    version: 1,
    at: normalizeIsoTimestamp(at),
    id: parseInboxUuid(id, "cursor"),
  };
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeInboxCursor(value: string | undefined) {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Partial<InboxCursor>;
    if (parsed.version !== 1 || typeof parsed.at !== "string" || typeof parsed.id !== "string") {
      throw new Error("Malformed cursor");
    }
    return {
      at: normalizeIsoTimestamp(parsed.at),
      id: parseInboxUuid(parsed.id, "cursor"),
    };
  } catch (error) {
    if (error instanceof InboxRequestError) throw error;
    throw invalidRequest("cursor is invalid or expired.");
  }
}

export function invalidRequest(message: string) {
  return new InboxRequestError("INVALID_REQUEST", message, 400);
}

export function inboxNotFound(resource: "Conversation" | "Contact") {
  return new InboxRequestError("NOT_FOUND", `${resource} was not found.`, 404);
}

function normalizeIsoTimestamp(value: string) {
  const timestamp = new Date(value);
  if (!value || Number.isNaN(timestamp.getTime()))
    throw invalidRequest("cursor is invalid or expired.");
  return timestamp.toISOString();
}
