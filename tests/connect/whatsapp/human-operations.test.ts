import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createInternalAdminSessionCookie } from "../../../src/features/connect/shared/admin-auth.server.ts";
import { createDashboardSessionCookie } from "../../../src/features/connect/shared/dashboard-auth.server.ts";
import {
  createAdminHumanTextReplyHandlers,
  createClientHumanTextReplyHandlers,
} from "../../../src/features/connect/shared/human-operations-api-handlers.server.ts";
import {
  HumanOperationsError,
  type HumanOperationsService,
  type HumanTextReplyCommand,
  type HumanTextReplyResult,
} from "../../../src/features/connect/shared/human-operations.ts";
import {
  createHumanOperationsService,
  type HumanOperationsDependencies,
} from "../../../src/features/connect/shared/human-operations.server.ts";

const CONVERSATION_ID = "11111111-1111-4111-8111-111111111111";
const OUTBOX_ID = "22222222-2222-4222-8222-222222222222";
const MESSAGE_ID = "33333333-3333-4333-8333-333333333333";
const WINDOW_END = "2026-07-18T12:00:00.000Z";

test("human send kill switch defaults off before any database claim", async () => {
  let resolved = false;
  const service = createHumanOperationsService({
    isSendEnabled: () => false,
    dataSource: fixtureDataSource({
      resolveConversation: async () => {
        resolved = true;
        return { business_id: "business-a", status: "OPEN" };
      },
    }),
  });

  await assert.rejects(
    service.sendTextReply(command()),
    (error: unknown) =>
      error instanceof HumanOperationsError && error.code === "HUMAN_SEND_DISABLED",
  );
  assert.equal(resolved, false);
});

test("claims, sends, and completes one durable human reply", async () => {
  const completed: Array<{ result: { ok: boolean } }> = [];
  const service = createHumanOperationsService({
    isSendEnabled: () => true,
    dataSource: fixtureDataSource({
      completeTextReply: async (input) => {
        completed.push(input);
        return completeRow("SENT");
      },
    }),
    resolveConnection: async () => ({ phoneNumberId: "phone-number-id", config: config() }),
    sendText: async (input) => {
      assert.equal(input.message, "Hello from support");
      assert.equal(input.logContext?.senderType, "HUMAN");
      return { ok: true, messageId: "wamid.test" };
    },
  });

  const result = await service.sendTextReply(command());
  assert.equal(result.status, "SENT");
  assert.equal(result.duplicate, false);
  assert.equal(completed.length, 1);
  assert.equal(completed[0].result.ok, true);
});

test("replayed idempotency key returns the existing outbox without resending", async () => {
  let sends = 0;
  const service = createHumanOperationsService({
    isSendEnabled: () => true,
    dataSource: fixtureDataSource({
      claimTextReply: async () => claimRow({ should_send: false, outbox_status: "SENT" }),
    }),
    sendText: async () => {
      sends += 1;
      return { ok: true, messageId: "wamid.unexpected" };
    },
  });

  const result = await service.sendTextReply(command());
  assert.equal(result.status, "SENT");
  assert.equal(result.duplicate, true);
  assert.equal(sends, 0);
});

test("rejects an idempotency key reused for a different reply", async () => {
  let sends = 0;
  const service = createHumanOperationsService({
    isSendEnabled: () => true,
    dataSource: fixtureDataSource({
      claimTextReply: async () =>
        claimRow({ should_send: false, block_code: "IDEMPOTENCY_CONFLICT" }),
    }),
    sendText: async () => {
      sends += 1;
      return { ok: true, messageId: "wamid.unexpected" };
    },
  });

  await assert.rejects(
    service.sendTextReply(command()),
    (error: unknown) =>
      error instanceof HumanOperationsError && error.code === "IDEMPOTENCY_CONFLICT",
  );
  assert.equal(sends, 0);
});

test("closed customer-service window requires an approved template and never sends", async () => {
  let sends = 0;
  const service = createHumanOperationsService({
    isSendEnabled: () => true,
    dataSource: fixtureDataSource({
      claimTextReply: async () =>
        claimRow({
          should_send: false,
          outbox_status: "BLOCKED",
          block_code: "TEMPLATE_REQUIRED",
        }),
    }),
    sendText: async () => {
      sends += 1;
      return { ok: true, messageId: "wamid.unexpected" };
    },
  });

  await assert.rejects(
    service.sendTextReply(command()),
    (error: unknown) => error instanceof HumanOperationsError && error.code === "TEMPLATE_REQUIRED",
  );
  assert.equal(sends, 0);
});

test("retryable provider failure remains durable for a later attempt", async () => {
  const service = createHumanOperationsService({
    isSendEnabled: () => true,
    dataSource: fixtureDataSource({
      completeTextReply: async (input) => {
        assert.equal(input.result.ok, false);
        assert.equal(input.result.ok ? false : input.result.retryable, true);
        return completeRow("RETRYABLE");
      },
    }),
    resolveConnection: async () => ({ phoneNumberId: "phone-number-id", config: config() }),
    sendText: async () => ({
      ok: false,
      status: 503,
      errorCode: "TEMPORARY",
      errorMessage: "Temporary provider failure",
      retryable: true,
    }),
  });

  const result = await service.sendTextReply(command());
  assert.equal(result.status, "RETRYABLE");
  assert.equal(result.retryable, true);
  assert.equal(result.errorCode, "TEMPORARY");
});

test("recovers a lost completion response without sending twice", async () => {
  let sends = 0;
  let completionCalls = 0;
  const service = createHumanOperationsService({
    isSendEnabled: () => true,
    dataSource: fixtureDataSource({
      completeTextReply: async () => {
        completionCalls += 1;
        throw new Error("response lost after commit");
      },
      getTextReplyState: async () => outboxState("SENT"),
    }),
    resolveConnection: async () => ({ phoneNumberId: "phone-number-id", config: config() }),
    sendText: async () => {
      sends += 1;
      return { ok: true, messageId: "wamid.committed" };
    },
  });

  const result = await service.sendTextReply(command());
  assert.equal(result.status, "SENT");
  assert.equal(sends, 1);
  assert.equal(completionCalls, 1);
});

test("retries a transient completion write without resending to Meta", async () => {
  let sends = 0;
  let completionCalls = 0;
  const service = createHumanOperationsService({
    isSendEnabled: () => true,
    dataSource: fixtureDataSource({
      completeTextReply: async () => {
        completionCalls += 1;
        if (completionCalls === 1) throw new Error("temporary database failure");
        return completeRow("SENT");
      },
      getTextReplyState: async () => outboxState("SENDING"),
    }),
    resolveConnection: async () => ({ phoneNumberId: "phone-number-id", config: config() }),
    sendText: async () => {
      sends += 1;
      return { ok: true, messageId: "wamid.once" };
    },
  });

  const result = await service.sendTextReply(command());
  assert.equal(result.status, "SENT");
  assert.equal(sends, 1);
  assert.equal(completionCalls, 2);
});

test("admin and client mutation handlers enforce auth and signed tenant scope", async () => {
  const previousAdminSecret = process.env.WA_INTERNAL_ADMIN_SESSION_SECRET;
  const previousClientSecret = process.env.WA_DASHBOARD_SESSION_SECRET;
  const previousBusiness = process.env.WA_DASHBOARD_BUSINESS_ID;
  process.env.WA_INTERNAL_ADMIN_SESSION_SECRET = "human-admin-test-secret";
  process.env.WA_DASHBOARD_SESSION_SECRET = "human-client-test-secret";
  process.env.WA_DASHBOARD_BUSINESS_ID = "business-a";

  try {
    const commands: HumanTextReplyCommand[] = [];
    const service: HumanOperationsService = {
      sendTextReply: async (input) => {
        commands.push(input);
        return successResult();
      },
    };
    const adminHandlers = createAdminHumanTextReplyHandlers(service);
    const clientHandlers = createClientHumanTextReplyHandlers(service);
    const url = `https://doubleacode.com/api/connect/admin/conversations/${CONVERSATION_ID}/messages`;
    const unauthorized = await adminHandlers.POST({
      request: request(url),
      params: { conversationId: CONVERSATION_ID },
    });
    assert.equal(unauthorized.status, 401);

    const adminCookie = createInternalAdminSessionCookie("admin").split(";", 1)[0];
    const adminResponse = await adminHandlers.POST({
      request: request(url, adminCookie),
      params: { conversationId: CONVERSATION_ID },
    });
    assert.equal(adminResponse.status, 200);
    assert.equal(commands[0].actorKind, "INTERNAL_ADMIN");
    assert.equal(commands[0].businessId, undefined);

    const workerHandlers = createAdminHumanTextReplyHandlers(service, async () => true);
    const workerResponse = await workerHandlers.POST({
      request: request(url),
      params: { conversationId: CONVERSATION_ID },
    });
    assert.equal(workerResponse.status, 200);
    assert.equal(commands[1].actorKind, "INTERNAL_ADMIN");
    assert.equal(commands[1].actorUsername, "connect-worker");
    assert.equal(commands[1].businessId, undefined);

    const disabledHandlers = createAdminHumanTextReplyHandlers(
      createHumanOperationsService({ isSendEnabled: () => false }),
    );
    const disabledResponse = await disabledHandlers.POST({
      request: request(url, adminCookie),
      params: { conversationId: CONVERSATION_ID },
    });
    assert.equal(disabledResponse.status, 503);
    assert.equal((await disabledResponse.json()).error.code, "HUMAN_SEND_DISABLED");

    const clientCookie = createDashboardSessionCookie("owner").split(";", 1)[0];
    const clientUrl = `https://doubleacode.com/api/connect/client/conversations/${CONVERSATION_ID}/messages`;
    const clientResponse = await clientHandlers.POST({
      request: request(clientUrl, clientCookie),
      params: { conversationId: CONVERSATION_ID },
    });
    assert.equal(clientResponse.status, 200);
    assert.equal(commands[2].actorKind, "BUSINESS_USER");
    assert.equal(commands[2].businessId, "business-a");

    const override = await clientHandlers.POST({
      request: request(`${clientUrl}?businessId=business-b`, clientCookie),
      params: { conversationId: CONVERSATION_ID },
    });
    assert.equal(override.status, 400);
    assert.equal((await override.json()).error.code, "INVALID_REQUEST");
  } finally {
    restoreEnv("WA_INTERNAL_ADMIN_SESSION_SECRET", previousAdminSecret);
    restoreEnv("WA_DASHBOARD_SESSION_SECRET", previousClientSecret);
    restoreEnv("WA_DASHBOARD_BUSINESS_ID", previousBusiness);
  }
});

test("human outbox migration is tenant-scoped, retry-aware, and service-role only", async () => {
  const sql = await readFile("supabase/connect/wa_human_operations_outbox.sql", "utf8");
  assert.match(sql, /create table if not exists public\.wa_human_outbox\s*\(/i);
  assert.match(sql, /create table if not exists public\.wa_human_outbox_attempts\s*\(/i);
  assert.match(sql, /unique \(business_id, idempotency_key\)/i);
  assert.match(sql, /v_existing\.conversation_id <> p_conversation_id/i);
  assert.match(sql, /'IDEMPOTENCY_CONFLICT'::text/i);
  assert.match(sql, /interval '24 hours'/i);
  assert.match(sql, /create or replace function public\.wa_claim_human_text_reply/i);
  assert.match(sql, /create or replace function public\.wa_complete_human_text_reply/i);
  assert.match(sql, /alter table public\.wa_human_outbox enable row level security/i);
  assert.match(
    sql,
    /revoke all on table public\.wa_human_outbox from public, anon, authenticated/i,
  );
  assert.match(
    sql,
    /revoke all on function public\.wa_claim_human_text_reply[\s\S]*authenticated/i,
  );
  assert.match(
    sql,
    /grant execute on function public\.wa_complete_human_text_reply[\s\S]*service_role/i,
  );
});

function fixtureDataSource(
  overrides: Partial<NonNullable<HumanOperationsDependencies["dataSource"]>> = {},
): NonNullable<HumanOperationsDependencies["dataSource"]> {
  return {
    resolveConversation: async () => ({ business_id: "business-a", status: "OPEN" }),
    claimTextReply: async () => claimRow(),
    completeTextReply: async () => completeRow("SENT"),
    getTextReplyState: async () => outboxState("SENDING"),
    ...overrides,
  };
}

type FixtureClaim = {
  outbox_id: string;
  message_id: string | null;
  business_id: string;
  conversation_id: string;
  connection_id: string | null;
  recipient_phone: string;
  outbox_status: string;
  attempt_number: number;
  should_send: boolean;
  block_code: string | null;
  service_window_expires_at: string | null;
};

function claimRow(overrides: Partial<FixtureClaim> = {}): FixtureClaim {
  return {
    outbox_id: OUTBOX_ID,
    message_id: MESSAGE_ID,
    business_id: "business-a",
    conversation_id: CONVERSATION_ID,
    connection_id: "connection-a",
    recipient_phone: "+96170000001",
    outbox_status: "SENDING",
    attempt_number: 1,
    should_send: true,
    block_code: null,
    service_window_expires_at: WINDOW_END,
    ...overrides,
  };
}

function completeRow(status: "SENT" | "RETRYABLE" | "FAILED") {
  return {
    outbox_id: OUTBOX_ID,
    message_id: MESSAGE_ID,
    outbox_status: status,
    attempt_number: 1,
    next_attempt_at: status === "RETRYABLE" ? "2026-07-17T12:01:00.000Z" : null,
  };
}

function outboxState(status: "SENDING" | "SENT" | "RETRYABLE" | "FAILED") {
  return {
    id: OUTBOX_ID,
    message_id: MESSAGE_ID,
    status,
    attempt_count: 1,
    next_attempt_at: status === "RETRYABLE" ? "2026-07-17T12:01:00.000Z" : null,
  };
}

function command(): HumanTextReplyCommand {
  return {
    conversationId: CONVERSATION_ID,
    businessId: "business-a",
    idempotencyKey: "reply-request-0001",
    body: "Hello from support",
    actorKind: "BUSINESS_USER",
    actorUsername: "owner",
  };
}

function successResult(): HumanTextReplyResult {
  return {
    outboxId: OUTBOX_ID,
    messageId: MESSAGE_ID,
    status: "SENT",
    attemptNumber: 1,
    duplicate: false,
    retryable: false,
    serviceWindowExpiresAt: WINDOW_END,
  };
}

function request(url: string, cookie?: string) {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify({ idempotencyKey: "reply-request-0001", body: "Hello" }),
  });
}

function config() {
  return {
    accessToken: "test-access-token",
    phoneNumberId: "phone-number-id",
    businessAccountId: "business-account-id",
    verifyToken: "verify-token",
    appSecret: "app-secret",
    graphApiVersion: "v23.0",
    envSuffix: "",
  };
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
