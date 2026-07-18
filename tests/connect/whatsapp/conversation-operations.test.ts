import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createInternalAdminSessionCookie } from "../../../src/features/connect/shared/admin-auth.server.ts";
import {
  createAdminConversationLifecycleHandlers,
  createClientConversationLifecycleHandlers,
  createConversationLifecycleProcessorHandlers,
} from "../../../src/features/connect/shared/conversation-operations-api-handlers.server.ts";
import {
  createConversationLifecycleProcessor,
  createConversationOperationsService,
  type ConversationOperationsDataSource,
} from "../../../src/features/connect/shared/conversation-operations.server.ts";
import {
  ConversationOperationsError,
  type ConversationLifecycleCommand,
  type ConversationOperationsService,
} from "../../../src/features/connect/shared/conversation-operations.ts";
import { createDashboardSessionCookie } from "../../../src/features/connect/shared/dashboard-auth.server.ts";
import { InboxRequestError } from "../../../src/features/connect/shared/inbox-query.ts";

const CONVERSATION_ID = "11111111-1111-4111-8111-111111111111";
const EVENT_ID = "22222222-2222-4222-8222-222222222222";
const NOW = new Date("2026-07-17T12:00:00.000Z");

test("applies an atomic lifecycle change in the resolved conversation tenant", async () => {
  let changedInput: Parameters<ConversationOperationsDataSource["changeLifecycle"]>[0] | undefined;
  const service = createConversationOperationsService({
    now: () => NOW,
    dataSource: dataSource({
      async changeLifecycle(input) {
        changedInput = input;
        return lifecycleRow({ current_status: "PENDING" });
      },
    }),
  });

  const result = await service.changeLifecycle(command({ status: "PENDING" }));

  assert.equal(changedInput?.businessId, "business-a");
  assert.equal(changedInput?.actorUsername, "owner@example.com");
  assert.equal(result.status, "PENDING");
  assert.equal(result.applied, true);
  assert.equal(result.eventId, EVENT_ID);
});

test("validates snooze windows before changing durable state", async () => {
  let changed = false;
  const service = createConversationOperationsService({
    now: () => NOW,
    dataSource: dataSource({
      async changeLifecycle(input) {
        changed = true;
        return lifecycleRow({ current_status: input.status });
      },
    }),
  });

  await assert.rejects(
    service.changeLifecycle(
      command({ status: "SNOOZED", snoozedUntil: "2026-07-17T11:59:59.000Z" }),
    ),
    (error) => error instanceof InboxRequestError && error.code === "INVALID_REQUEST",
  );
  await assert.rejects(
    service.changeLifecycle(
      command({ status: "SNOOZED", snoozedUntil: "2027-07-18T12:00:00.000Z" }),
    ),
    (error) => error instanceof InboxRequestError && error.code === "INVALID_REQUEST",
  );
  assert.equal(changed, false);
});

test("maps lifecycle conflicts to stable domain errors", async () => {
  const service = createConversationOperationsService({
    dataSource: dataSource({
      async changeLifecycle() {
        return lifecycleRow({ block_code: "ACTIVE_CONVERSATION_EXISTS", applied: false });
      },
    }),
  });

  await assert.rejects(
    service.changeLifecycle(command({ status: "OPEN" })),
    (error) =>
      error instanceof ConversationOperationsError &&
      error.code === "ACTIVE_CONVERSATION_EXISTS" &&
      error.status === 409,
  );

  const closedService = createConversationOperationsService({
    dataSource: dataSource({
      async changeLifecycle() {
        return lifecycleRow({ block_code: "CONVERSATION_CLOSED", applied: false });
      },
    }),
  });
  await assert.rejects(
    closedService.changeLifecycle(command({ status: "PENDING" })),
    (error) => error instanceof ConversationOperationsError && error.code === "CONVERSATION_CLOSED",
  );
});

test("wakes due snoozes through the protected lifecycle processor", async () => {
  let receivedLimit = 0;
  const data = dataSource({
    async wakeDueSnoozed({ limit }) {
      receivedLimit = limit;
      return [
        {
          awakened_conversation_id: CONVERSATION_ID,
          awakened_business_id: "business-a",
          awakened_event_id: EVENT_ID,
        },
      ];
    },
  });
  const processor = createConversationLifecycleProcessor(data);
  assert.deepEqual(await processor.processDue({ limit: 25 }), { awakened: 1 });
  assert.equal(receivedLimit, 25);

  const previousWorkerSecret = process.env.CONNECT_WORKER_SECRET;
  process.env.CONNECT_WORKER_SECRET = "connect-worker-secret";
  try {
    const handlers = createConversationLifecycleProcessorHandlers(processor);
    const url = "https://doubleacode.com/api/connect/admin/conversations/process-lifecycle";
    const unauthorized = await handlers.POST({ request: post(url, { limit: 10 }) });
    assert.equal(unauthorized.status, 401);

    const authorized = await handlers.POST({
      request: post(url, { limit: 25 }, { authorization: "Bearer connect-worker-secret" }),
    });
    assert.equal(authorized.status, 200);
    assert.deepEqual((await authorized.json()).data, { awakened: 1 });
  } finally {
    restoreEnv("CONNECT_WORKER_SECRET", previousWorkerSecret);
  }
});

test("admin and client PATCH handlers enforce authentication and signed tenant scope", async () => {
  const previousAdminSecret = process.env.WA_INTERNAL_ADMIN_SESSION_SECRET;
  const previousDashboardSecret = process.env.WA_DASHBOARD_SESSION_SECRET;
  const previousBusinessId = process.env.WA_DASHBOARD_BUSINESS_ID;
  process.env.WA_INTERNAL_ADMIN_SESSION_SECRET = "admin-session-secret";
  process.env.WA_DASHBOARD_SESSION_SECRET = "dashboard-session-secret";
  process.env.WA_DASHBOARD_BUSINESS_ID = "business-client";

  const commands: ConversationLifecycleCommand[] = [];
  const service: ConversationOperationsService = {
    async changeLifecycle(input) {
      commands.push(input);
      return {
        conversationId: input.conversationId,
        businessId: input.businessId ?? "business-admin",
        previousStatus: "OPEN",
        status: input.status,
        snoozedUntil: input.snoozedUntil ?? null,
        applied: true,
        duplicate: false,
        eventId: EVENT_ID,
      };
    },
  };

  try {
    const adminHandlers = createAdminConversationLifecycleHandlers(service);
    const clientHandlers = createClientConversationLifecycleHandlers(service);
    const url = `https://doubleacode.com/api/connect/admin/conversations/${CONVERSATION_ID}`;
    const body = { status: "PENDING", idempotencyKey: "lifecycle-handler-1" };

    const unauthorized = await adminHandlers.PATCH({
      request: patch(url, body),
      params: { conversationId: CONVERSATION_ID },
    });
    assert.equal(unauthorized.status, 401);

    const adminCookie = createInternalAdminSessionCookie("admin").split(";")[0];
    const adminResponse = await adminHandlers.PATCH({
      request: patch(url, body, { cookie: adminCookie }),
      params: { conversationId: CONVERSATION_ID },
    });
    assert.equal(adminResponse.status, 200);
    assert.equal(commands[0]?.actorKind, "INTERNAL_ADMIN");
    assert.equal(commands[0]?.businessId, undefined);

    const clientCookie = createDashboardSessionCookie("owner").split(";")[0];
    const clientUrl = url.replace("/admin/", "/client/");
    const clientResponse = await clientHandlers.PATCH({
      request: patch(clientUrl, body, { cookie: clientCookie }),
      params: { conversationId: CONVERSATION_ID },
    });
    assert.equal(clientResponse.status, 200);
    assert.equal(commands[1]?.actorKind, "BUSINESS_USER");
    assert.equal(commands[1]?.businessId, "business-client");

    const override = await clientHandlers.PATCH({
      request: patch(`${clientUrl}?businessId=business-other`, body, { cookie: clientCookie }),
      params: { conversationId: CONVERSATION_ID },
    });
    assert.equal(override.status, 400);
    assert.equal(commands.length, 2);
  } finally {
    restoreEnv("WA_INTERNAL_ADMIN_SESSION_SECRET", previousAdminSecret);
    restoreEnv("WA_DASHBOARD_SESSION_SECRET", previousDashboardSecret);
    restoreEnv("WA_DASHBOARD_BUSINESS_ID", previousBusinessId);
  }
});

test("lifecycle migration is tenant-scoped, audited, idempotent, and service-role only", async () => {
  const sql = await readFile("supabase/connect/wa_conversation_lifecycle_rpc.sql", "utf8");
  assert.match(sql, /create or replace function public\.wa_change_conversation_lifecycle/i);
  assert.match(
    sql,
    /where conversation\.business_id = p_business_id[\s\S]*conversation\.id = p_conversation_id/i,
  );
  assert.match(sql, /pg_advisory_xact_lock/i);
  assert.match(sql, /wa_conversation_events_command_key_uidx/i);
  assert.match(sql, /wa_conversation_messages_open_on_inbound/i);
  assert.match(sql, /create or replace function public\.wa_wake_due_snoozed_conversations/i);
  assert.match(sql, /for update skip locked/i);
  assert.match(sql, /'SNOOZE_EXPIRED'/);
  assert.match(sql, /'ACTIVE_CONVERSATION_EXISTS'/);
  assert.match(sql, /'CONVERSATION_CLOSED'/);
  assert.match(sql, /'REOPENED'/);
  assert.match(sql, /'SNOOZED'/);
  assert.match(sql, /command_idempotency_key/);
  assert.match(
    sql,
    /revoke all on function public\.wa_change_conversation_lifecycle[\s\S]*authenticated/i,
  );
  assert.match(
    sql,
    /grant execute on function public\.wa_change_conversation_lifecycle[\s\S]*service_role/i,
  );
});

function dataSource(
  overrides: Partial<ConversationOperationsDataSource> = {},
): ConversationOperationsDataSource {
  return {
    async resolveConversation() {
      return { id: CONVERSATION_ID, business_id: "business-a" };
    },
    async changeLifecycle() {
      return lifecycleRow();
    },
    async wakeDueSnoozed() {
      return [];
    },
    ...overrides,
  };
}

function lifecycleRow(overrides: Record<string, unknown> = {}) {
  return {
    changed_conversation_id: CONVERSATION_ID,
    changed_business_id: "business-a",
    previous_status: "OPEN" as const,
    current_status: "CLOSED" as const,
    current_snoozed_until: null,
    applied: true,
    duplicate: false,
    block_code: null,
    event_id: EVENT_ID,
    ...overrides,
  };
}

function command(
  overrides: Partial<ConversationLifecycleCommand> = {},
): ConversationLifecycleCommand {
  return {
    conversationId: CONVERSATION_ID,
    businessId: "business-a",
    status: "CLOSED",
    idempotencyKey: "lifecycle-command-1",
    actorKind: "BUSINESS_USER",
    actorUsername: "owner@example.com",
    ...overrides,
  };
}

function patch(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(url, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function post(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
