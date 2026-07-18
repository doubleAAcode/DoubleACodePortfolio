import "@tanstack/react-start/server-only";

import { getInternalAdminSessionFromRequest } from "./admin-auth.server.ts";
import { isConnectWorkerAuthorized } from "./connect-worker-auth.server.ts";
import { getDashboardSessionFromRequest } from "./dashboard-auth.server.ts";
import {
  HumanOperationsError,
  parseHumanTextReplyRequest,
  type HumanOperationsService,
  type HumanTextReplyResult,
} from "./human-operations.ts";
import { createHumanOperationsService } from "./human-operations.server.ts";
import { InboxRequestError, parseInboxUuid } from "./inbox-query.ts";

let defaultService: HumanOperationsService | undefined;

export function createAdminHumanTextReplyHandlers(
  service = getDefaultService(),
  authorizeWorker = isConnectWorkerAuthorized,
) {
  return {
    POST: async ({ request, params }: MessageHandlerContext) => {
      const session = getInternalAdminSessionFromRequest(request);
      const workerAuthorized = session ? false : await authorizeWorker(request);
      if (!session && !workerAuthorized) return unauthorized();
      try {
        const input = parseHumanTextReplyRequest(await request.json().catch(() => null));
        const data = await service.sendTextReply({
          conversationId: parseInboxUuid(params.conversationId, "conversationId"),
          ...input,
          actorKind: "INTERNAL_ADMIN",
          actorUsername: session?.username ?? "connect-worker",
        });
        return humanReplyResponse(data);
      } catch (error) {
        return humanOperationsApiError(error);
      }
    },
  };
}

export function createClientHumanTextReplyHandlers(service = getDefaultService()) {
  return {
    POST: async ({ request, params }: MessageHandlerContext) => {
      const session = getDashboardSessionFromRequest(request);
      if (!session) return unauthorized();
      try {
        const url = new URL(request.url);
        if (url.searchParams.has("businessId")) {
          throw new InboxRequestError(
            "INVALID_REQUEST",
            "businessId is derived from the signed client session.",
            400,
          );
        }
        const input = parseHumanTextReplyRequest(await request.json().catch(() => null));
        const data = await service.sendTextReply({
          conversationId: parseInboxUuid(params.conversationId, "conversationId"),
          businessId: session.businessId,
          ...input,
          actorKind: "BUSINESS_USER",
          actorUsername: session.username,
        });
        return humanReplyResponse(data);
      } catch (error) {
        return humanOperationsApiError(error);
      }
    },
  };
}

type MessageHandlerContext = {
  request: Request;
  params: { conversationId: string };
};

function humanReplyResponse(data: HumanTextReplyResult) {
  const status =
    data.status === "SENT"
      ? 200
      : data.status === "SENDING" || data.status === "RETRYABLE"
        ? 202
        : 502;
  return Response.json({ ok: true, data }, { status });
}

function unauthorized() {
  return Response.json(
    { ok: false, error: { code: "UNAUTHORIZED", message: "Authentication is required." } },
    { status: 401 },
  );
}

function humanOperationsApiError(error: unknown) {
  if (error instanceof HumanOperationsError || error instanceof InboxRequestError) {
    return Response.json(
      { ok: false, error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }
  const message = error instanceof Error ? error.message : "Unknown human operations failure";
  console.error("[connect:human-operations-api] request failed", { message });
  return Response.json(
    {
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "The human reply could not be processed." },
    },
    { status: 500 },
  );
}

function getDefaultService() {
  defaultService ??= createHumanOperationsService();
  return defaultService;
}
