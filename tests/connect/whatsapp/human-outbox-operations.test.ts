import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createInternalAdminSessionCookie } from "../../../src/features/connect/shared/admin-auth.server.ts";
import {
  createAdminHumanReconciliationHandlers,
  createHumanOutboxProcessorHandlers,
} from "../../../src/features/connect/shared/human-outbox-operations-api-handlers.server.ts";
import {
  createHumanOutboxProcessor,
  type HumanOutboxOperationsDataSource,
} from "../../../src/features/connect/shared/human-outbox-operations.server.ts";
import type {
  HumanOutboxProcessor,
  HumanReconciliationService,
  HumanRetryProcessorSummary,
} from "../../../src/features/connect/shared/human-outbox-operations.ts";
import type { HumanOperationsDataSource } from "../../../src/features/connect/shared/human-operations.server.ts";

const CONVERSATION_ID = "11111111-1111-4111-8111-111111111111";
const OUTBOX_ID = "22222222-2222-4222-8222-222222222222";
const MESSAGE_ID = "33333333-3333-4333-8333-333333333333";

test("send-disabled processor still quarantines expired ambiguous sends", async () => {
  let claimCalls = 0;
  let sends = 0;
  const processor = createHumanOutboxProcessor({
    isSendEnabled: () => false,
    operationsDataSource: operationsDataSource({
      quarantineExpired: async () => [quarantinedRow()],
      claimDueRetries: async () => {
        claimCalls += 1;
        return [retryClaim()];
      },
    }),
    completionDataSource: completionDataSource(),
    sendText: async () => {
      sends += 1;
      return { ok: true, messageId: "wamid.unexpected" };
    },
  });

  const summary = await processor.processDueReplies();
  assert.equal(summary.sendEnabled, false);
  assert.equal(summary.quarantined, 1);
  assert.equal(summary.reconciliationRequired, 1);
  assert.equal(claimCalls, 0);
  assert.equal(sends, 0);
});

test("claims a due retry, sends once, and completes the next attempt", async () => {
  let sends = 0;
  let completedAttempt = 0;
  const processor = createHumanOutboxProcessor({
    isSendEnabled: () => true,
    operationsDataSource: operationsDataSource({
      claimDueRetries: async () => [retryClaim()],
    }),
    completionDataSource: completionDataSource({
      completeTextReply: async (input) => {
        completedAttempt = input.attemptNumber;
        return completeRow("SENT");
      },
    }),
    resolveConnection: async () => ({ phoneNumberId: "phone-id", config: config() }),
    sendText: async (input) => {
      sends += 1;
      assert.equal(input.message, "Retry this reply");
      return { ok: true, messageId: "wamid.retry" };
    },
  });

  const summary = await processor.processDueReplies({ limit: 5 });
  assert.equal(summary.claimed, 1);
  assert.equal(summary.sent, 1);
  assert.equal(completedAttempt, 2);
  assert.equal(sends, 1);
});

test("blocked and exhausted retry candidates never call the provider", async () => {
  let sends = 0;
  const processor = createHumanOutboxProcessor({
    isSendEnabled: () => true,
    operationsDataSource: operationsDataSource({
      claimDueRetries: async () => [
        retryClaim({ should_send: false, block_code: "TEMPLATE_REQUIRED" }),
        retryClaim({ should_send: false, block_code: "MAX_ATTEMPTS_REACHED" }),
      ],
    }),
    completionDataSource: completionDataSource(),
    sendText: async () => {
      sends += 1;
      return { ok: true, messageId: "wamid.unexpected" };
    },
  });

  const summary = await processor.processDueReplies();
  assert.equal(summary.blocked, 1);
  assert.equal(summary.exhausted, 1);
  assert.equal(summary.claimed, 0);
  assert.equal(sends, 0);
});

test("retry processor and reconciliation handlers enforce their authorization boundaries", async () => {
  const previousAdminSecret = process.env.WA_INTERNAL_ADMIN_SESSION_SECRET;
  const previousWorkerSecret = process.env.CONNECT_HUMAN_WORKER_SECRET;
  process.env.WA_INTERNAL_ADMIN_SESSION_SECRET = "outbox-admin-secret";
  process.env.CONNECT_HUMAN_WORKER_SECRET = "outbox-worker-secret";

  try {
    let processorCalls = 0;
    const processor: HumanOutboxProcessor = {
      processDueReplies: async () => {
        processorCalls += 1;
        return summary();
      },
    };
    const processorHandlers = createHumanOutboxProcessorHandlers(processor);
    const processUrl = "https://doubleacode.com/api/connect/admin/human-outbox/process";

    const unauthorized = await processorHandlers.POST({ request: post(processUrl, {}) });
    assert.equal(unauthorized.status, 401);

    const workerResponse = await processorHandlers.POST({
      request: post(processUrl, { limit: 4 }, { authorization: "Bearer outbox-worker-secret" }),
    });
    assert.equal(workerResponse.status, 200);
    assert.equal(processorCalls, 1);

    const adminCookie = createInternalAdminSessionCookie("admin").split(";", 1)[0];
    const adminResponse = await processorHandlers.POST({
      request: post(processUrl, { limit: 4 }, { cookie: adminCookie }),
    });
    assert.equal(adminResponse.status, 200);
    assert.equal(processorCalls, 2);

    let resolvedBy = "";
    const reconciliationService: HumanReconciliationService = {
      listRequired: async () => [],
      resolve: async (input) => {
        resolvedBy = input.resolvedByUsername;
        return {
          outboxId: OUTBOX_ID,
          messageId: MESSAGE_ID,
          status: "FAILED",
          attemptNumber: 1,
          nextAttemptAt: null,
        };
      },
    };
    const reconciliationHandlers = createAdminHumanReconciliationHandlers(reconciliationService);
    const reconciliationUrl =
      "https://doubleacode.com/api/connect/admin/human-outbox/reconciliation";
    const workerCannotResolve = await reconciliationHandlers.POST({
      request: post(reconciliationUrl, reconciliationRequest(), {
        authorization: "Bearer outbox-worker-secret",
      }),
    });
    assert.equal(workerCannotResolve.status, 401);

    const resolved = await reconciliationHandlers.POST({
      request: post(reconciliationUrl, reconciliationRequest(), { cookie: adminCookie }),
    });
    assert.equal(resolved.status, 200);
    assert.equal(resolvedBy, "admin");
  } finally {
    restoreEnv("WA_INTERNAL_ADMIN_SESSION_SECRET", previousAdminSecret);
    restoreEnv("CONNECT_HUMAN_WORKER_SECRET", previousWorkerSecret);
  }
});

test("retry migration separates safe retries from ambiguous sends and is service-role only", async () => {
  const sql = await readFile(
    "supabase/connect/wa_human_operations_retry_reconciliation.sql",
    "utf8",
  );
  assert.match(sql, /'RECONCILIATION_REQUIRED'/);
  assert.match(sql, /create or replace function public\.wa_quarantine_expired_human_sends/i);
  assert.match(sql, /outbox\.status = 'SENDING'[\s\S]*?lease_expires_at <= now\(\)/i);
  assert.match(sql, /create or replace function public\.wa_claim_due_human_text_replies/i);
  assert.match(sql, /outbox\.status = 'RETRYABLE'[\s\S]*?for update skip locked/i);
  assert.match(sql, /service_window_expires_at <= now\(\)[\s\S]*?'TEMPLATE_REQUIRED'/i);
  assert.match(sql, /wa_human_outbox_expired_lease_idx[\s\S]*?status = 'SENDING'/i);
  assert.match(
    sql,
    /wa_human_outbox_reconciliation_idx[\s\S]*?status = 'RECONCILIATION_REQUIRED'/i,
  );
  assert.match(sql, /create or replace function public\.wa_resolve_human_send_reconciliation/i);
  assert.match(sql, /resolution = p_resolution/);
  assert.match(
    sql,
    /revoke all on function public\.wa_claim_due_human_text_replies[\s\S]*authenticated/i,
  );
  assert.match(
    sql,
    /grant execute on function public\.wa_resolve_human_send_reconciliation[\s\S]*service_role/i,
  );
});

function operationsDataSource(
  overrides: Partial<HumanOutboxOperationsDataSource> = {},
): HumanOutboxOperationsDataSource {
  return {
    quarantineExpired: async () => [],
    claimDueRetries: async () => [],
    listReconciliationRequired: async () => [],
    resolveReconciliation: async () => ({
      resolved_outbox_id: OUTBOX_ID,
      resolved_message_id: MESSAGE_ID,
      resolved_status: "FAILED",
      resolved_attempt_number: 1,
      resolved_next_attempt_at: null,
    }),
    ...overrides,
  };
}

function completionDataSource(
  overrides: Partial<HumanOperationsDataSource> = {},
): HumanOperationsDataSource {
  return {
    resolveConversation: async () => ({ business_id: "business-a", status: "OPEN" }),
    claimTextReply: async () => retryClaim(),
    completeTextReply: async () => completeRow("SENT"),
    getTextReplyState: async () => ({
      id: OUTBOX_ID,
      message_id: MESSAGE_ID,
      status: "SENDING",
      attempt_count: 2,
      next_attempt_at: null,
    }),
    ...overrides,
  };
}

function retryClaim(overrides: Record<string, unknown> = {}) {
  return {
    outbox_id: OUTBOX_ID,
    message_id: MESSAGE_ID,
    business_id: "business-a",
    conversation_id: CONVERSATION_ID,
    connection_id: "connection-a",
    recipient_phone: "+96170000001",
    body: "Retry this reply",
    outbox_status: "SENDING",
    attempt_number: 2,
    should_send: true,
    block_code: null,
    service_window_expires_at: "2026-07-18T12:00:00.000Z",
    ...overrides,
  };
}

function quarantinedRow() {
  return {
    quarantined_outbox_id: OUTBOX_ID,
    quarantined_business_id: "business-a",
    quarantined_message_id: MESSAGE_ID,
    quarantined_attempt_number: 1,
  };
}

function completeRow(status: "SENT" | "RETRYABLE" | "FAILED") {
  return {
    outbox_id: OUTBOX_ID,
    message_id: MESSAGE_ID,
    outbox_status: status,
    attempt_number: 2,
    next_attempt_at: status === "RETRYABLE" ? "2026-07-17T12:01:00.000Z" : null,
  };
}

function summary(): HumanRetryProcessorSummary {
  return {
    sendEnabled: false,
    quarantined: 0,
    candidates: 0,
    claimed: 0,
    sent: 0,
    retryable: 0,
    failed: 0,
    blocked: 0,
    exhausted: 0,
    reconciliationRequired: 0,
    completionUncertain: 0,
  };
}

function reconciliationRequest() {
  return {
    businessId: "business-a",
    outboxId: OUTBOX_ID,
    resolution: "CONFIRM_FAILED",
    note: "Provider logs confirm no send.",
  };
}

function post(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
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
