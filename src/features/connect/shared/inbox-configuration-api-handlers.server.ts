import "@tanstack/react-start/server-only";

import { getInternalAdminSessionFromRequest } from "./admin-auth.server.ts";
import {
  InboxConfigurationError,
  parseCannedReplyArchiveRequest,
  parseCannedReplyWriteRequest,
  type InboxConfigurationService,
} from "./inbox-configuration.ts";
import { createInboxConfigurationService } from "./inbox-configuration.server.ts";
import { getDashboardSessionFromRequest } from "./dashboard-auth.server.ts";
import {
  InboxRequestError,
  invalidRequest,
  parseInboxBoolean,
  parseInboxBusinessId,
  parseInboxUuid,
} from "./inbox-query.ts";

let defaultService: InboxConfigurationService | undefined;

export function createAdminInboxOptionsHandlers(service = getDefaultService()) {
  return {
    GET: async ({ request }: RequestContext) => {
      if (!getInternalAdminSessionFromRequest(request)) return unauthorized();
      try {
        const businessId = requireAdminBusinessId(request);
        return Response.json({ ok: true, data: await service.getOptions(businessId) });
      } catch (error) {
        return configurationApiError(error);
      }
    },
  };
}

export function createClientInboxOptionsHandlers(service = getDefaultService()) {
  return {
    GET: async ({ request }: RequestContext) => {
      const session = getDashboardSessionFromRequest(request);
      if (!session) return unauthorized();
      try {
        rejectClientBusinessOverride(request);
        return Response.json({ ok: true, data: await service.getOptions(session.businessId) });
      } catch (error) {
        return configurationApiError(error);
      }
    },
  };
}

export function createAdminCannedReplyCollectionHandlers(service = getDefaultService()) {
  return {
    GET: async ({ request }: RequestContext) => {
      if (!getInternalAdminSessionFromRequest(request)) return unauthorized();
      try {
        const url = new URL(request.url);
        const data = await service.listCannedReplies(
          requireAdminBusinessId(request),
          parseInboxBoolean(url.searchParams.get("includeInactive"), "includeInactive") ?? false,
        );
        return Response.json({ ok: true, data });
      } catch (error) {
        return configurationApiError(error);
      }
    },
    POST: async ({ request }: RequestContext) => {
      const session = getInternalAdminSessionFromRequest(request);
      if (!session) return unauthorized();
      try {
        const input = parseCannedReplyWriteRequest(await readJson(request));
        const data = await service.saveCannedReply({
          businessId: requireAdminBusinessId(request),
          operation: "CREATE",
          ...input,
          actorKind: "INTERNAL_ADMIN",
          actorUsername: session.username,
        });
        return Response.json({ ok: true, data }, { status: data.duplicate ? 200 : 201 });
      } catch (error) {
        return configurationApiError(error);
      }
    },
  };
}

export function createClientCannedReplyCollectionHandlers(service = getDefaultService()) {
  return {
    GET: async ({ request }: RequestContext) => {
      const session = getDashboardSessionFromRequest(request);
      if (!session) return unauthorized();
      try {
        rejectClientBusinessOverride(request);
        const includeInactive =
          parseInboxBoolean(
            new URL(request.url).searchParams.get("includeInactive"),
            "includeInactive",
          ) ?? false;
        return Response.json({
          ok: true,
          data: await service.listCannedReplies(session.businessId, includeInactive),
        });
      } catch (error) {
        return configurationApiError(error);
      }
    },
    POST: async ({ request }: RequestContext) => {
      const session = getDashboardSessionFromRequest(request);
      if (!session) return unauthorized();
      try {
        rejectClientBusinessOverride(request);
        const input = parseCannedReplyWriteRequest(await readJson(request));
        const data = await service.saveCannedReply({
          businessId: session.businessId,
          operation: "CREATE",
          ...input,
          actorKind: "BUSINESS_USER",
          actorUsername: session.username,
        });
        return Response.json({ ok: true, data }, { status: data.duplicate ? 200 : 201 });
      } catch (error) {
        return configurationApiError(error);
      }
    },
  };
}

export function createAdminCannedReplyItemHandlers(service = getDefaultService()) {
  return createCannedReplyItemHandlers(service, "admin");
}

export function createClientCannedReplyItemHandlers(service = getDefaultService()) {
  return createCannedReplyItemHandlers(service, "client");
}

function createCannedReplyItemHandlers(
  service: InboxConfigurationService,
  audience: "admin" | "client",
) {
  const handle = async (operation: "UPDATE" | "ARCHIVE", { request, params }: ItemContext) => {
    const adminSession =
      audience === "admin" ? getInternalAdminSessionFromRequest(request) : undefined;
    const clientSession =
      audience === "client" ? getDashboardSessionFromRequest(request) : undefined;
    const session = adminSession ?? clientSession;
    if (!session) return unauthorized();
    try {
      if (clientSession) rejectClientBusinessOverride(request);
      const input =
        operation === "UPDATE"
          ? parseCannedReplyWriteRequest(await readJson(request))
          : parseCannedReplyArchiveRequest(await readJson(request));
      const data = await service.saveCannedReply({
        businessId: clientSession?.businessId ?? requireAdminBusinessId(request),
        operation,
        replyId: parseInboxUuid(params.replyId, "replyId"),
        ...input,
        actorKind: clientSession ? "BUSINESS_USER" : "INTERNAL_ADMIN",
        actorUsername: session.username,
      });
      return Response.json({ ok: true, data });
    } catch (error) {
      return configurationApiError(error);
    }
  };
  return {
    PATCH: (context: ItemContext) => handle("UPDATE", context),
    DELETE: (context: ItemContext) => handle("ARCHIVE", context),
  };
}

type RequestContext = { request: Request };
type ItemContext = RequestContext & { params: { replyId: string } };

function requireAdminBusinessId(request: Request) {
  const value = new URL(request.url).searchParams.get("businessId");
  if (!value) throw invalidRequest("businessId is required for internal admin requests.");
  return parseInboxBusinessId(value);
}

function rejectClientBusinessOverride(request: Request) {
  if (new URL(request.url).searchParams.has("businessId")) {
    throw invalidRequest("businessId is derived from the signed client session.");
  }
}

async function readJson(request: Request) {
  try {
    return (await request.json()) as unknown;
  } catch {
    throw invalidRequest("The request body must be valid JSON.");
  }
}

function unauthorized() {
  return Response.json(
    { ok: false, error: { code: "UNAUTHORIZED", message: "Authentication is required." } },
    { status: 401 },
  );
}

function configurationApiError(error: unknown) {
  if (error instanceof InboxConfigurationError || error instanceof InboxRequestError) {
    return Response.json(
      { ok: false, error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }
  console.error("[connect:inbox-configuration-api] request failed", {
    errorType: error instanceof Error ? error.name : "UnknownError",
  });
  return Response.json(
    {
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Inbox configuration could not be processed." },
    },
    { status: 500 },
  );
}

function getDefaultService() {
  defaultService ??= createInboxConfigurationService();
  return defaultService;
}
