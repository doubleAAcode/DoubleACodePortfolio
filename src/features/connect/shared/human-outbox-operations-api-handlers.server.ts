import "@tanstack/react-start/server-only";

import { timingSafeEqual } from "node:crypto";

import { getInternalAdminSessionFromRequest } from "./admin-auth.server.ts";
import {
  parseHumanOperationLimit,
  parseHumanProcessorRequest,
  parseHumanReconciliationRequest,
  type HumanOutboxProcessor,
  type HumanReconciliationService,
} from "./human-outbox-operations.ts";
import {
  createHumanOutboxProcessor,
  createHumanReconciliationService,
} from "./human-outbox-operations.server.ts";
import { InboxRequestError, invalidRequest } from "./inbox-query.ts";

let defaultProcessor: HumanOutboxProcessor | undefined;
let defaultReconciliationService: HumanReconciliationService | undefined;

export function createHumanOutboxProcessorHandlers(
  processor: HumanOutboxProcessor = getDefaultProcessor(),
) {
  return {
    POST: async ({ request }: { request: Request }) => {
      if (!getInternalAdminSessionFromRequest(request) && !isHumanWorkerAuthorized(request)) {
        return unauthorized();
      }
      try {
        const input = parseHumanProcessorRequest(await readOptionalJson(request));
        const data = await processor.processDueReplies(input);
        return Response.json({ ok: true, data });
      } catch (error) {
        return operationsError(error);
      }
    },
  };
}

export function createAdminHumanReconciliationHandlers(
  service: HumanReconciliationService = getDefaultReconciliationService(),
) {
  return {
    GET: async ({ request }: { request: Request }) => {
      if (!getInternalAdminSessionFromRequest(request)) return unauthorized();
      try {
        const url = new URL(request.url);
        const data = await service.listRequired({
          limit: parseHumanOperationLimit(url.searchParams.get("limit"), 20),
        });
        return Response.json({ ok: true, data });
      } catch (error) {
        return operationsError(error);
      }
    },
    POST: async ({ request }: { request: Request }) => {
      const session = getInternalAdminSessionFromRequest(request);
      if (!session) return unauthorized();
      try {
        const input = parseHumanReconciliationRequest(await readRequiredJson(request));
        const data = await service.resolve({
          ...input,
          resolvedByUsername: session.username,
        });
        return Response.json({ ok: true, data });
      } catch (error) {
        return operationsError(error);
      }
    },
  };
}

export function isHumanWorkerAuthorized(request: Request) {
  const secret = process.env.CONNECT_HUMAN_WORKER_SECRET || process.env.CRON_SECRET || "";
  const authorization = request.headers.get("authorization") ?? "";
  if (!secret || !authorization.startsWith("Bearer ")) return false;
  return timingSafeStringEqual(authorization.slice("Bearer ".length), secret);
}

async function readOptionalJson(request: Request) {
  const text = await request.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw invalidRequest("The request body must be valid JSON.");
  }
}

async function readRequiredJson(request: Request) {
  const value = await readOptionalJson(request);
  if (value == null) throw invalidRequest("A JSON request body is required.");
  return value;
}

function unauthorized() {
  return Response.json(
    { ok: false, error: { code: "UNAUTHORIZED", message: "Authentication is required." } },
    { status: 401 },
  );
}

function operationsError(error: unknown) {
  if (error instanceof InboxRequestError) {
    return Response.json(
      { ok: false, error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }
  console.error("[connect:human-outbox-api] request failed", {
    errorType: error instanceof Error ? error.name : "UnknownError",
  });
  return Response.json(
    {
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "The outbox operation could not be processed." },
    },
    { status: 500 },
  );
}

function timingSafeStringEqual(leftValue: string, rightValue: string) {
  const left = Buffer.from(leftValue);
  const right = Buffer.from(rightValue);
  return left.length === right.length && timingSafeEqual(left, right);
}

function getDefaultProcessor() {
  defaultProcessor ??= createHumanOutboxProcessor();
  return defaultProcessor;
}

function getDefaultReconciliationService() {
  defaultReconciliationService ??= createHumanReconciliationService();
  return defaultReconciliationService;
}
