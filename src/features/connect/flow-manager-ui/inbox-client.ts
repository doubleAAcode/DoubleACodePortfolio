import type { InboxConfigurationOptions } from "../shared/inbox-configuration.ts";
import type {
  InboxConversationDetail,
  InboxConversationPriority,
  InboxConversationStatus,
  InboxPage,
  InboxConversationSummary,
} from "../shared/inbox-query.ts";
import type { HumanTextReplyResult } from "../shared/human-operations.ts";

export type InboxAudience = "admin" | "client";

export type InboxConversationFilters = {
  search?: string;
  status?: InboxConversationStatus;
  assignee?: string | "unassigned";
  unread?: boolean;
  tagId?: string;
  limit?: number;
  cursor?: string;
};

export class InboxApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "InboxApiError";
    this.code = code;
    this.status = status;
  }
}

export async function getInboxConversations(
  audience: InboxAudience,
  filters: InboxConversationFilters = {},
) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.assignee) params.set("assignee", filters.assignee);
  if (filters.unread !== undefined) params.set("unread", String(filters.unread));
  if (filters.tagId) params.set("tag", filters.tagId);
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.cursor) params.set("cursor", filters.cursor);
  const query = params.size ? `?${params.toString()}` : "";
  return inboxFetch<InboxPage<InboxConversationSummary>>(
    `${inboxApiBase(audience)}/conversations${query}`,
  );
}

export function getInboxConversation(
  audience: InboxAudience,
  conversationId: string,
  timelineLimit = 100,
) {
  return inboxFetch<InboxConversationDetail>(
    `${inboxApiBase(audience)}/conversations/${encodeURIComponent(conversationId)}?limit=${timelineLimit}`,
  );
}

export function getInboxOptions(audience: InboxAudience, businessId: string) {
  const query = audience === "admin" ? `?businessId=${encodeURIComponent(businessId)}` : "";
  return inboxFetch<InboxConfigurationOptions>(`${inboxApiBase(audience)}/inbox-options${query}`);
}

export function sendInboxTextReply(
  audience: InboxAudience,
  conversationId: string,
  body: string,
  idempotencyKey: string,
) {
  return inboxFetch<HumanTextReplyResult>(
    `${inboxApiBase(audience)}/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ body, idempotencyKey }),
    },
  );
}

export function updateInboxConversation(
  audience: InboxAudience,
  conversationId: string,
  command:
    | { status: InboxConversationStatus; snoozedUntil?: string }
    | { priority: InboxConversationPriority }
    | { assigneeUserId: string | null }
    | { unread: boolean },
  idempotencyKey: string,
) {
  return inboxFetch<unknown>(
    `${inboxApiBase(audience)}/conversations/${encodeURIComponent(conversationId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ ...command, idempotencyKey }),
    },
  );
}

export function addInboxConversationNote(
  audience: InboxAudience,
  conversationId: string,
  note: string,
  idempotencyKey: string,
) {
  return inboxFetch<unknown>(
    `${inboxApiBase(audience)}/conversations/${encodeURIComponent(conversationId)}/notes`,
    {
      method: "POST",
      body: JSON.stringify({ note, idempotencyKey }),
    },
  );
}

export function changeInboxConversationTag(
  audience: InboxAudience,
  conversationId: string,
  tagId: string,
  operation: "ADD" | "REMOVE",
  idempotencyKey: string,
) {
  return inboxFetch<unknown>(
    `${inboxApiBase(audience)}/conversations/${encodeURIComponent(conversationId)}/tags/${encodeURIComponent(tagId)}`,
    {
      method: operation === "ADD" ? "PUT" : "DELETE",
      body: JSON.stringify({ idempotencyKey }),
    },
  );
}

export function createInboxIdempotencyKey(operation: string) {
  const normalizedOperation = operation.replace(/[^A-Za-z0-9._:-]/g, "-").slice(0, 60);
  const unique =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `ui-${normalizedOperation || "command"}-${unique}`;
}

function inboxApiBase(audience: InboxAudience) {
  return audience === "admin" ? "/api/connect/admin" : "/api/connect/client";
}

async function inboxFetch<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new InboxApiError("INVALID_RESPONSE", "The inbox returned an invalid response.", 502);
  }

  const result = payload as {
    ok?: boolean;
    data?: T;
    error?: string | { code?: string; message?: string };
    message?: string;
  } | null;
  if (!response.ok || !result?.ok) {
    const error = result?.error;
    throw new InboxApiError(
      typeof error === "object" && error?.code ? error.code : "REQUEST_FAILED",
      typeof error === "string"
        ? error
        : error?.message || result?.message || "The inbox request could not be completed.",
      response.status,
    );
  }
  return result.data as T;
}
