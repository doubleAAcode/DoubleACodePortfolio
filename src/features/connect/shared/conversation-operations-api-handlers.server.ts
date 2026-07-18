import "@tanstack/react-start/server-only";

import { getInternalAdminSessionFromRequest } from "./admin-auth.server.ts";
import { isConnectWorkerAuthorized } from "./connect-worker-auth.server.ts";
import {
  ConversationOperationsError,
  parseConversationLifecycleRequest,
  parseConversationLifecycleProcessorRequest,
  type ConversationLifecycleProcessor,
  type ConversationOperationsService,
} from "./conversation-operations.ts";
import {
  createConversationLifecycleProcessor,
  createConversationOperationsService,
} from "./conversation-operations.server.ts";
import { getDashboardSessionFromRequest } from "./dashboard-auth.server.ts";
import { InboxRequestError, parseInboxUuid } from "./inbox-query.ts";

let defaultService: ConversationOperationsService | undefined;
let defaultProcessor: ConversationLifecycleProcessor | undefined;

export function createConversationLifecycleProcessorHandlers(processor = getDefaultProcessor()) {
  return {
    POST: async ({ request }: { request: Request }) => {
      if (!getInternalAdminSessionFromRequest(request) && !isConnectWorkerAuthorized(request)) {
        return unauthorized();
      }
      try {
        const input = parseConversationLifecycleProcessorRequest(await readOptionalJson(request));
        const data = await processor.processDue(input);
        return Response.json({ ok: true, data });
      } catch (error) {
        return conversationOperationsApiError(error);
      }
    },
  };
}

export function createAdminConversationLifecycleHandlers(service = getDefaultService()) {
  return {
    PATCH: async ({ request, params }: LifecycleHandlerContext) => {
      const session = getInternalAdminSessionFromRequest(request);
      if (!session) return unauthorized();
      try {
        const input = parseConversationLifecycleRequest(await readJson(request));
        const data = await service.changeLifecycle({
          conversationId: parseInboxUuid(params.conversationId, "conversationId"),
          ...input,
          actorKind: "INTERNAL_ADMIN",
          actorUsername: session.username,
        });
        return Response.json({ ok: true, data });
      } catch (error) {
        return conversationOperationsApiError(error);
      }
    },
  };
}

export function createClientConversationLifecycleHandlers(service = getDefaultService()) {
  return {
    PATCH: async ({ request, params }: LifecycleHandlerContext) => {
      const session = getDashboardSessionFromRequest(request);
      if (!session) return unauthorized();
      try {
        if (new URL(request.url).searchParams.has("businessId")) {
          throw new InboxRequestError(
            "INVALID_REQUEST",
            "businessId is derived from the signed client session.",
            400,
          );
        }
        const input = parseConversationLifecycleRequest(await readJson(request));
        const data = await service.changeLifecycle({
          conversationId: parseInboxUuid(params.conversationId, "conversationId"),
          businessId: session.businessId,
          ...input,
          actorKind: "BUSINESS_USER",
          actorUsername: session.username,
        });
        return Response.json({ ok: true, data });
      } catch (error) {
        return conversationOperationsApiError(error);
      }
    },
  };
}

type LifecycleHandlerContext = {
  request: Request;
  params: { conversationId: string };
};

async function readJson(request: Request) {
  try {
    return (await request.json()) as unknown;
  } catch {
    throw new InboxRequestError("INVALID_REQUEST", "The request body must be valid JSON.", 400);
  }
}

async function readOptionalJson(request: Request) {
  const text = await request.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new InboxRequestError("INVALID_REQUEST", "The request body must be valid JSON.", 400);
  }
}

function unauthorized() {
  return Response.json(
    { ok: false, error: { code: "UNAUTHORIZED", message: "Authentication is required." } },
    { status: 401 },
  );
}

function conversationOperationsApiError(error: unknown) {
  if (error instanceof ConversationOperationsError || error instanceof InboxRequestError) {
    return Response.json(
      { ok: false, error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }
  console.error("[connect:conversation-operations-api] request failed", {
    errorType: error instanceof Error ? error.name : "UnknownError",
  });
  return Response.json(
    {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "The conversation change could not be processed.",
      },
    },
    { status: 500 },
  );
}

function getDefaultService() {
  defaultService ??= createConversationOperationsService();
  return defaultService;
}

function getDefaultProcessor() {
  defaultProcessor ??= createConversationLifecycleProcessor();
  return defaultProcessor;
}
