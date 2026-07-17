import "@tanstack/react-start/server-only";

import { getInternalAdminSessionFromRequest } from "./admin-auth.server.ts";
import { getDashboardSessionFromRequest } from "./dashboard-auth.server.ts";
import {
  InboxRequestError,
  invalidRequest,
  parseContactLifecycle,
  parseConversationStatus,
  parseInboxAssignee,
  parseInboxBoolean,
  parseInboxBusinessId,
  parseInboxPageLimit,
  parseInboxSearch,
  parseInboxUuid,
  type InboxContactListInput,
  type InboxConversationListInput,
  type InboxQueryService,
} from "./inbox-query.ts";
import { createInboxQueryService } from "./inbox-query.server.ts";

let defaultService: InboxQueryService | undefined;

export function createAdminConversationListHandlers(service = getDefaultService()) {
  return {
    GET: async ({ request }: { request: Request }) => {
      const session = getInternalAdminSessionFromRequest(request);
      if (!session) return unauthorized();
      try {
        const url = new URL(request.url);
        const parsed = parseConversationListQuery(url.searchParams, true);
        const data = await service.listConversations({
          ...parsed.filters,
          businessIds: parsed.businessId ? [parsed.businessId] : undefined,
        });
        return Response.json({ ok: true, data });
      } catch (error) {
        return inboxApiError(error);
      }
    },
  };
}

export function createAdminConversationDetailHandlers(service = getDefaultService()) {
  return {
    GET: async ({ request, params }: { request: Request; params: { conversationId: string } }) => {
      const session = getInternalAdminSessionFromRequest(request);
      if (!session) return unauthorized();
      try {
        const page = parseDetailPageQuery(new URL(request.url).searchParams);
        const data = await service.getConversation({
          conversationId: parseInboxUuid(params.conversationId, "conversationId"),
          timelineLimit: page.limit,
          timelineCursor: page.cursor,
        });
        return Response.json({ ok: true, data });
      } catch (error) {
        return inboxApiError(error);
      }
    },
  };
}

export function createClientConversationListHandlers(service = getDefaultService()) {
  return {
    GET: async ({ request }: { request: Request }) => {
      const session = getDashboardSessionFromRequest(request);
      if (!session) return unauthorized();
      try {
        const parsed = parseConversationListQuery(new URL(request.url).searchParams, false);
        const data = await service.listConversations({
          ...parsed.filters,
          businessIds: [session.businessId],
        });
        return Response.json({ ok: true, data });
      } catch (error) {
        return inboxApiError(error);
      }
    },
  };
}

export function createClientConversationDetailHandlers(service = getDefaultService()) {
  return {
    GET: async ({ request, params }: { request: Request; params: { conversationId: string } }) => {
      const session = getDashboardSessionFromRequest(request);
      if (!session) return unauthorized();
      try {
        rejectBrowserBusinessScope(new URL(request.url).searchParams);
        const page = parseDetailPageQuery(new URL(request.url).searchParams);
        const data = await service.getConversation({
          conversationId: parseInboxUuid(params.conversationId, "conversationId"),
          businessIds: [session.businessId],
          timelineLimit: page.limit,
          timelineCursor: page.cursor,
        });
        return Response.json({ ok: true, data });
      } catch (error) {
        return inboxApiError(error);
      }
    },
  };
}

export function createAdminContactListHandlers(service = getDefaultService()) {
  return {
    GET: async ({ request }: { request: Request }) => {
      const session = getInternalAdminSessionFromRequest(request);
      if (!session) return unauthorized();
      try {
        const parsed = parseContactListQuery(new URL(request.url).searchParams, true);
        const data = await service.listContacts({
          ...parsed.filters,
          businessIds: parsed.businessId ? [parsed.businessId] : undefined,
        });
        return Response.json({ ok: true, data });
      } catch (error) {
        return inboxApiError(error);
      }
    },
  };
}

export function createAdminContactDetailHandlers(service = getDefaultService()) {
  return {
    GET: async ({ request, params }: { request: Request; params: { contactId: string } }) => {
      const session = getInternalAdminSessionFromRequest(request);
      if (!session) return unauthorized();
      try {
        const page = parseDetailPageQuery(new URL(request.url).searchParams);
        const data = await service.getContact({
          contactId: parseInboxUuid(params.contactId, "contactId"),
          conversationLimit: page.limit,
          conversationCursor: page.cursor,
        });
        return Response.json({ ok: true, data });
      } catch (error) {
        return inboxApiError(error);
      }
    },
  };
}

export function createClientContactListHandlers(service = getDefaultService()) {
  return {
    GET: async ({ request }: { request: Request }) => {
      const session = getDashboardSessionFromRequest(request);
      if (!session) return unauthorized();
      try {
        const parsed = parseContactListQuery(new URL(request.url).searchParams, false);
        const data = await service.listContacts({
          ...parsed.filters,
          businessIds: [session.businessId],
        });
        return Response.json({ ok: true, data });
      } catch (error) {
        return inboxApiError(error);
      }
    },
  };
}

export function createClientContactDetailHandlers(service = getDefaultService()) {
  return {
    GET: async ({ request, params }: { request: Request; params: { contactId: string } }) => {
      const session = getDashboardSessionFromRequest(request);
      if (!session) return unauthorized();
      try {
        rejectBrowserBusinessScope(new URL(request.url).searchParams);
        const page = parseDetailPageQuery(new URL(request.url).searchParams);
        const data = await service.getContact({
          contactId: parseInboxUuid(params.contactId, "contactId"),
          businessIds: [session.businessId],
          conversationLimit: page.limit,
          conversationCursor: page.cursor,
        });
        return Response.json({ ok: true, data });
      } catch (error) {
        return inboxApiError(error);
      }
    },
  };
}

function parseConversationListQuery(searchParams: URLSearchParams, allowBusinessId: boolean) {
  const businessId = parseBusinessScope(searchParams, allowBusinessId);
  const filters: InboxConversationListInput = {
    search: parseInboxSearch(searchParams.get("search")),
    status: parseConversationStatus(searchParams.get("status")),
    assignee: parseInboxAssignee(searchParams.get("assignee")),
    unread: parseInboxBoolean(searchParams.get("unread"), "unread"),
    tagId: parseOptionalUuid(searchParams.get("tag"), "tag"),
    limit: parseInboxPageLimit(searchParams.get("limit")),
    cursor: searchParams.get("cursor") || undefined,
  };
  return { businessId, filters };
}

function parseContactListQuery(searchParams: URLSearchParams, allowBusinessId: boolean) {
  const businessId = parseBusinessScope(searchParams, allowBusinessId);
  const filters: InboxContactListInput = {
    search: parseInboxSearch(searchParams.get("search")),
    lifecycle: parseContactLifecycle(searchParams.get("lifecycle")),
    tagId: parseOptionalUuid(searchParams.get("tag"), "tag"),
    limit: parseInboxPageLimit(searchParams.get("limit")),
    cursor: searchParams.get("cursor") || undefined,
  };
  return { businessId, filters };
}

function parseDetailPageQuery(searchParams: URLSearchParams) {
  return {
    limit: parseInboxPageLimit(searchParams.get("limit"), 50),
    cursor: searchParams.get("cursor") || undefined,
  };
}

function parseBusinessScope(searchParams: URLSearchParams, allowBusinessId: boolean) {
  if (!allowBusinessId) {
    rejectBrowserBusinessScope(searchParams);
    return undefined;
  }
  const value = searchParams.get("businessId");
  return value ? parseInboxBusinessId(value) : undefined;
}

function rejectBrowserBusinessScope(searchParams: URLSearchParams) {
  if (searchParams.has("businessId")) {
    throw invalidRequest("businessId is derived from the signed client session.");
  }
}

function parseOptionalUuid(value: string | null, field: string) {
  return value ? parseInboxUuid(value, field) : undefined;
}

function unauthorized() {
  return Response.json(
    { ok: false, error: { code: "UNAUTHORIZED", message: "Authentication is required." } },
    { status: 401 },
  );
}

function inboxApiError(error: unknown) {
  if (error instanceof InboxRequestError) {
    return Response.json(
      { ok: false, error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }
  const message = error instanceof Error ? error.message : "Unknown inbox failure";
  console.error("[connect:inbox-api] request failed", { message });
  return Response.json(
    { ok: false, error: { code: "INTERNAL_ERROR", message: "Inbox data could not be loaded." } },
    { status: 500 },
  );
}

function getDefaultService() {
  defaultService ??= createInboxQueryService();
  return defaultService;
}
