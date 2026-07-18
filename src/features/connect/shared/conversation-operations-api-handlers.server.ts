import "@tanstack/react-start/server-only";

import { getInternalAdminSessionFromRequest } from "./admin-auth.server.ts";
import { isConnectWorkerAuthorized } from "./connect-worker-auth.server.ts";
import {
  ConversationOperationsError,
  parseConversationCommandRequest,
  parseConversationLifecycleRequest,
  parseConversationLifecycleProcessorRequest,
  parseConversationNoteRequest,
  parseConversationTagRequest,
  type ConversationLifecycleProcessor,
  type ConversationCommandService,
  type ConversationOperationsService,
} from "./conversation-operations.ts";
import {
  createConversationLifecycleProcessor,
  createConversationOperationsService,
} from "./conversation-operations.server.ts";
import { getDashboardSessionFromRequest } from "./dashboard-auth.server.ts";
import { InboxRequestError, parseInboxUuid } from "./inbox-query.ts";

let defaultService: ConversationCommandService | undefined;
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

export function createAdminConversationCommandHandlers(service = getDefaultService()) {
  return {
    PATCH: async ({ request, params }: LifecycleHandlerContext) => {
      const session = getInternalAdminSessionFromRequest(request);
      if (!session) return unauthorized();
      try {
        const command = parseConversationCommandRequest(await readJson(request));
        const actor = {
          conversationId: parseInboxUuid(params.conversationId, "conversationId"),
          actorKind: "INTERNAL_ADMIN" as const,
          actorUsername: session.username,
        };
        const data =
          command.kind === "lifecycle"
            ? await service.changeLifecycle({ ...actor, ...command })
            : await service.changeCollaboration({ ...actor, ...command });
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

export function createClientConversationCommandHandlers(service = getDefaultService()) {
  return {
    PATCH: async ({ request, params }: LifecycleHandlerContext) => {
      const session = getDashboardSessionFromRequest(request);
      if (!session) return unauthorized();
      try {
        rejectClientBusinessOverride(request);
        const command = parseConversationCommandRequest(await readJson(request));
        const actor = {
          conversationId: parseInboxUuid(params.conversationId, "conversationId"),
          businessId: session.businessId,
          actorKind: "BUSINESS_USER" as const,
          actorUsername: session.username,
        };
        const data =
          command.kind === "lifecycle"
            ? await service.changeLifecycle({ ...actor, ...command })
            : await service.changeCollaboration({ ...actor, ...command });
        return Response.json({ ok: true, data });
      } catch (error) {
        return conversationOperationsApiError(error);
      }
    },
  };
}

export function createAdminConversationNoteHandlers(service = getDefaultService()) {
  return {
    POST: async ({ request, params }: LifecycleHandlerContext) => {
      const session = getInternalAdminSessionFromRequest(request);
      if (!session) return unauthorized();
      try {
        const command = parseConversationNoteRequest(await readJson(request));
        const data = await service.addNote({
          conversationId: parseInboxUuid(params.conversationId, "conversationId"),
          ...command,
          actorKind: "INTERNAL_ADMIN",
          actorUsername: session.username,
        });
        return Response.json({ ok: true, data }, { status: data.duplicate ? 200 : 201 });
      } catch (error) {
        return conversationOperationsApiError(error);
      }
    },
  };
}

export function createClientConversationNoteHandlers(service = getDefaultService()) {
  return {
    POST: async ({ request, params }: LifecycleHandlerContext) => {
      const session = getDashboardSessionFromRequest(request);
      if (!session) return unauthorized();
      try {
        rejectClientBusinessOverride(request);
        const command = parseConversationNoteRequest(await readJson(request));
        const data = await service.addNote({
          conversationId: parseInboxUuid(params.conversationId, "conversationId"),
          businessId: session.businessId,
          ...command,
          actorKind: "BUSINESS_USER",
          actorUsername: session.username,
        });
        return Response.json({ ok: true, data }, { status: data.duplicate ? 200 : 201 });
      } catch (error) {
        return conversationOperationsApiError(error);
      }
    },
  };
}

export function createAdminConversationTagHandlers(service = getDefaultService()) {
  return createConversationTagHandlers(service, "admin");
}

export function createClientConversationTagHandlers(service = getDefaultService()) {
  return createConversationTagHandlers(service, "client");
}

function createConversationTagHandlers(
  service: ConversationCommandService,
  audience: "admin" | "client",
) {
  const handle = async (operation: "ADD" | "REMOVE", { request, params }: TagHandlerContext) => {
    const adminSession =
      audience === "admin" ? getInternalAdminSessionFromRequest(request) : undefined;
    const clientSession =
      audience === "client" ? getDashboardSessionFromRequest(request) : undefined;
    const session = adminSession ?? clientSession;
    if (!session) return unauthorized();
    try {
      if (clientSession) rejectClientBusinessOverride(request);
      const command = parseConversationTagRequest(await readJson(request));
      const data = await service.changeTag({
        conversationId: parseInboxUuid(params.conversationId, "conversationId"),
        ...(clientSession ? { businessId: clientSession.businessId } : {}),
        tagId: parseInboxUuid(params.tagId, "tagId"),
        operation,
        ...command,
        actorKind: clientSession ? "BUSINESS_USER" : "INTERNAL_ADMIN",
        actorUsername: session.username,
      });
      return Response.json({ ok: true, data });
    } catch (error) {
      return conversationOperationsApiError(error);
    }
  };
  return {
    PUT: (context: TagHandlerContext) => handle("ADD", context),
    DELETE: (context: TagHandlerContext) => handle("REMOVE", context),
  };
}

type LifecycleHandlerContext = {
  request: Request;
  params: { conversationId: string };
};

type TagHandlerContext = LifecycleHandlerContext & {
  params: { conversationId: string; tagId: string };
};

function rejectClientBusinessOverride(request: Request) {
  if (new URL(request.url).searchParams.has("businessId")) {
    throw new InboxRequestError(
      "INVALID_REQUEST",
      "businessId is derived from the signed client session.",
      400,
    );
  }
}

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
