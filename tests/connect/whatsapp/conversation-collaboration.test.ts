import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createInternalAdminSessionCookie } from "../../../src/features/connect/shared/admin-auth.server.ts";
import {
  createAdminConversationCommandHandlers,
  createAdminConversationNoteHandlers,
  createClientConversationCommandHandlers,
  createClientConversationTagHandlers,
} from "../../../src/features/connect/shared/conversation-operations-api-handlers.server.ts";
import {
  createConversationOperationsService,
  type ConversationOperationsDataSource,
} from "../../../src/features/connect/shared/conversation-operations.server.ts";
import {
  ConversationOperationsError,
  parseConversationCommandRequest,
} from "../../../src/features/connect/shared/conversation-operations.ts";
import { createDashboardSessionCookie } from "../../../src/features/connect/shared/dashboard-auth.server.ts";
import {
  createAdminInboxOptionsHandlers,
  createClientCannedReplyCollectionHandlers,
} from "../../../src/features/connect/shared/inbox-configuration-api-handlers.server.ts";
import {
  createInboxConfigurationService,
  type InboxConfigurationDataSource,
} from "../../../src/features/connect/shared/inbox-configuration.server.ts";
import { InboxConfigurationError } from "../../../src/features/connect/shared/inbox-configuration.ts";
import { InboxRequestError } from "../../../src/features/connect/shared/inbox-query.ts";

const CONVERSATION_ID = "11111111-1111-4111-8111-111111111111";
const ASSIGNEE_ID = "22222222-2222-4222-8222-222222222222";
const TAG_ID = "33333333-3333-4333-8333-333333333333";
const EVENT_ID = "44444444-4444-4444-8444-444444444444";
const REPLY_ID = "55555555-5555-4555-8555-555555555555";

test("parses exactly one conversation field command", () => {
  assert.deepEqual(
    parseConversationCommandRequest({
      priority: "URGENT",
      idempotencyKey: "priority-command-1",
    }),
    {
      kind: "collaboration",
      operation: "SET_PRIORITY",
      priority: "URGENT",
      idempotencyKey: "priority-command-1",
    },
  );
  assert.deepEqual(
    parseConversationCommandRequest({
      assigneeUserId: null,
      idempotencyKey: "unassign-command-1",
    }),
    {
      kind: "collaboration",
      operation: "UNASSIGN",
      idempotencyKey: "unassign-command-1",
    },
  );
  assert.throws(
    () =>
      parseConversationCommandRequest({
        priority: "HIGH",
        unread: false,
        idempotencyKey: "invalid-command-1",
      }),
    (error) => error instanceof InboxRequestError && error.code === "INVALID_REQUEST",
  );
});

test("applies collaboration, note, and tag commands inside the resolved tenant", async () => {
  const calls: Array<{ method: string; businessId: string }> = [];
  const service = createConversationOperationsService({
    dataSource: operationsDataSource({
      async changeCollaboration(input) {
        calls.push({ method: "collaboration", businessId: input.businessId });
        return collaborationRow({
          changed_operation: input.operation,
          current_priority: input.priority ?? "NORMAL",
          current_assignee_user_id: input.assigneeUserId ?? null,
          current_unread_count: input.unread ? 1 : 0,
        });
      },
      async addNote(input) {
        calls.push({ method: "note", businessId: input.businessId });
        return auditRow();
      },
      async changeTag(input) {
        calls.push({ method: "tag", businessId: input.businessId });
        return { ...auditRow(), changed_tag_id: input.tagId };
      },
    }),
  });

  const actor = {
    conversationId: CONVERSATION_ID,
    businessId: "business-a",
    actorKind: "BUSINESS_USER" as const,
    actorUsername: "owner@example.com",
  };
  const assignment = await service.changeCollaboration({
    ...actor,
    operation: "ASSIGN",
    assigneeUserId: ASSIGNEE_ID,
    idempotencyKey: "assignment-command-1",
  });
  const note = await service.addNote({
    ...actor,
    note: "Customer needs a manager callback.",
    idempotencyKey: "note-command-1",
  });
  const tag = await service.changeTag({
    ...actor,
    tagId: TAG_ID,
    operation: "ADD",
    idempotencyKey: "tag-command-1",
  });

  assert.equal(assignment.assigneeUserId, ASSIGNEE_ID);
  assert.equal(note.eventId, EVENT_ID);
  assert.equal(tag.tagId, TAG_ID);
  assert.deepEqual(calls, [
    { method: "collaboration", businessId: "business-a" },
    { method: "note", businessId: "business-a" },
    { method: "tag", businessId: "business-a" },
  ]);
});

test("maps cross-tenant collaboration blocks to stable errors", async () => {
  const unavailable = createConversationOperationsService({
    dataSource: operationsDataSource({
      async changeCollaboration() {
        return collaborationRow({ block_code: "ASSIGNEE_NOT_AVAILABLE", applied: false });
      },
    }),
  });
  await assert.rejects(
    unavailable.changeCollaboration(collaborationCommand()),
    (error) =>
      error instanceof ConversationOperationsError && error.code === "ASSIGNEE_NOT_AVAILABLE",
  );

  const missingTag = createConversationOperationsService({
    dataSource: operationsDataSource({
      async changeTag() {
        return { ...auditRow(), changed_tag_id: TAG_ID, block_code: "TAG_NOT_FOUND" };
      },
    }),
  });
  await assert.rejects(
    missingTag.changeTag({
      ...actor(),
      tagId: TAG_ID,
      operation: "ADD",
      idempotencyKey: "missing-tag-command",
    }),
    (error) =>
      error instanceof ConversationOperationsError &&
      error.code === "TAG_NOT_FOUND" &&
      error.status === 404,
  );
});

test("admin and client collaboration routes enforce signed scope", async () => {
  const env = captureAuthEnv();
  process.env.WA_INTERNAL_ADMIN_SESSION_SECRET = "admin-session-secret";
  process.env.WA_DASHBOARD_SESSION_SECRET = "dashboard-session-secret";
  process.env.WA_DASHBOARD_BUSINESS_ID = "business-client";
  const service = createConversationOperationsService({ dataSource: operationsDataSource() });

  try {
    const adminHandlers = createAdminConversationCommandHandlers(service);
    const clientHandlers = createClientConversationCommandHandlers(service);
    const adminUrl = `https://doubleacode.com/api/connect/admin/conversations/${CONVERSATION_ID}`;
    const body = { unread: false, idempotencyKey: "read-handler-command" };

    const unauthorized = await adminHandlers.PATCH({
      request: request("PATCH", adminUrl, body),
      params: { conversationId: CONVERSATION_ID },
    });
    assert.equal(unauthorized.status, 401);

    const admin = await adminHandlers.PATCH({
      request: request("PATCH", adminUrl, body, {
        cookie: createInternalAdminSessionCookie("admin").split(";")[0],
      }),
      params: { conversationId: CONVERSATION_ID },
    });
    assert.equal(admin.status, 200);

    const clientUrl = adminUrl.replace("/admin/", "/client/");
    const clientCookie = createDashboardSessionCookie("owner").split(";")[0];
    const client = await clientHandlers.PATCH({
      request: request("PATCH", clientUrl, body, { cookie: clientCookie }),
      params: { conversationId: CONVERSATION_ID },
    });
    assert.equal(client.status, 404);

    const override = await clientHandlers.PATCH({
      request: request("PATCH", `${clientUrl}?businessId=business-a`, body, {
        cookie: clientCookie,
      }),
      params: { conversationId: CONVERSATION_ID },
    });
    assert.equal(override.status, 400);
  } finally {
    restoreAuthEnv(env);
  }
});

test("note and tag route handlers never send note content and require auth", async () => {
  const env = captureAuthEnv();
  process.env.WA_INTERNAL_ADMIN_SESSION_SECRET = "admin-session-secret";
  process.env.WA_DASHBOARD_SESSION_SECRET = "dashboard-session-secret";
  process.env.WA_DASHBOARD_BUSINESS_ID = "business-a";
  const service = createConversationOperationsService({ dataSource: operationsDataSource() });
  try {
    const noteHandlers = createAdminConversationNoteHandlers(service);
    const noteUrl = `https://doubleacode.com/api/connect/admin/conversations/${CONVERSATION_ID}/notes`;
    const note = await noteHandlers.POST({
      request: request(
        "POST",
        noteUrl,
        { note: "Internal only", idempotencyKey: "note-handler-command" },
        { cookie: createInternalAdminSessionCookie("admin").split(";")[0] },
      ),
      params: { conversationId: CONVERSATION_ID },
    });
    assert.equal(note.status, 201);

    const tagHandlers = createClientConversationTagHandlers(service);
    const tag = await tagHandlers.PUT({
      request: request(
        "PUT",
        `https://doubleacode.com/api/connect/client/conversations/${CONVERSATION_ID}/tags/${TAG_ID}`,
        { idempotencyKey: "tag-handler-command" },
        { cookie: createDashboardSessionCookie("owner").split(";")[0] },
      ),
      params: { conversationId: CONVERSATION_ID, tagId: TAG_ID },
    });
    assert.equal(tag.status, 200);
  } finally {
    restoreAuthEnv(env);
  }
});

test("inbox options and canned replies use one tenant-scoped configuration service", async () => {
  let saved: Parameters<InboxConfigurationDataSource["saveCannedReply"]>[0] | undefined;
  const service = createInboxConfigurationService(
    configurationDataSource({
      async saveCannedReply(input) {
        saved = input;
        return cannedReplyRow();
      },
    }),
  );

  const options = await service.getOptions("business-a");
  assert.equal(options.assignees[0]?.id, ASSIGNEE_ID);
  assert.equal(options.tags[0]?.id, TAG_ID);
  assert.equal(options.cannedReplies[0]?.id, REPLY_ID);

  const result = await service.saveCannedReply({
    businessId: "business-a",
    operation: "CREATE",
    title: "Greeting",
    body: "Hello, how can we help?",
    shortcut: "/hello",
    idempotencyKey: "canned-create-command",
    actorKind: "BUSINESS_USER",
    actorUsername: "owner",
  });
  assert.equal(saved?.businessId, "business-a");
  assert.equal(result.reply.id, REPLY_ID);
});

test("canned reply routes derive client scope and sanitize conflicts", async () => {
  const env = captureAuthEnv();
  process.env.WA_INTERNAL_ADMIN_SESSION_SECRET = "admin-session-secret";
  process.env.WA_DASHBOARD_SESSION_SECRET = "dashboard-session-secret";
  process.env.WA_DASHBOARD_BUSINESS_ID = "business-a";
  const service = createInboxConfigurationService(configurationDataSource());
  try {
    const adminOptions = createAdminInboxOptionsHandlers(service);
    const missingScope = await adminOptions.GET({
      request: new Request("https://doubleacode.com/api/connect/admin/inbox-options", {
        headers: { cookie: createInternalAdminSessionCookie("admin").split(";")[0] },
      }),
    });
    assert.equal(missingScope.status, 400);

    const clientReplies = createClientCannedReplyCollectionHandlers(service);
    const clientCookie = createDashboardSessionCookie("owner").split(";")[0];
    const override = await clientReplies.GET({
      request: new Request(
        "https://doubleacode.com/api/connect/client/canned-replies?businessId=business-b",
        { headers: { cookie: clientCookie } },
      ),
    });
    assert.equal(override.status, 400);

    const conflictService = createInboxConfigurationService(
      configurationDataSource({
        async saveCannedReply() {
          return cannedReplyRow({ block_code: "SHORTCUT_CONFLICT", applied: false });
        },
      }),
    );
    const response = await createClientCannedReplyCollectionHandlers(conflictService).POST({
      request: request(
        "POST",
        "https://doubleacode.com/api/connect/client/canned-replies",
        {
          title: "Greeting",
          body: "Hello",
          shortcut: "/hello",
          idempotencyKey: "canned-conflict-command",
        },
        { cookie: clientCookie },
      ),
    });
    assert.equal(response.status, 409);
    assert.equal((await response.json()).error.code, "SHORTCUT_CONFLICT");
  } finally {
    restoreAuthEnv(env);
  }
});

test("collaboration migration is tenant-scoped, audited, and service-role only", async () => {
  const sql = await readFile("supabase/connect/wa_conversation_collaboration_rpc.sql", "utf8");
  assert.match(sql, /create or replace function public\.wa_change_conversation_collaboration/i);
  assert.match(sql, /create or replace function public\.wa_add_conversation_note/i);
  assert.match(sql, /create or replace function public\.wa_change_conversation_tag/i);
  assert.match(sql, /create or replace function public\.wa_save_canned_reply/i);
  assert.match(sql, /business_user\.business_id = p_business_id[\s\S]*status = 'ACTIVE'/i);
  assert.match(sql, /tag\.business_id = p_business_id[\s\S]*tag\.id = p_tag_id/i);
  assert.match(sql, /'internal', true/i);
  assert.match(sql, /wa_canned_reply_audit_events/i);
  assert.match(sql, /pg_advisory_xact_lock/i);
  assert.match(sql, /'IDEMPOTENCY_CONFLICT'/i);
  assert.match(
    sql,
    /revoke all on function public\.wa_change_conversation_collaboration[\s\S]*authenticated/i,
  );
  assert.match(sql, /grant execute on function public\.wa_save_canned_reply[\s\S]*service_role/i);
});

function operationsDataSource(
  overrides: Partial<ConversationOperationsDataSource> = {},
): ConversationOperationsDataSource {
  return {
    async resolveConversation({ businessId }) {
      if (businessId === "business-client") return undefined;
      return { id: CONVERSATION_ID, business_id: "business-a" };
    },
    async changeLifecycle() {
      return {
        changed_conversation_id: CONVERSATION_ID,
        changed_business_id: "business-a",
        previous_status: "OPEN",
        current_status: "PENDING",
        current_snoozed_until: null,
        applied: true,
        duplicate: false,
        block_code: null,
        event_id: EVENT_ID,
      };
    },
    async wakeDueSnoozed() {
      return [];
    },
    async changeCollaboration(input) {
      return collaborationRow({
        changed_operation: input.operation,
        current_priority: input.priority ?? "NORMAL",
        current_assignee_user_id: input.assigneeUserId ?? null,
        current_unread_count: input.unread ? 1 : 0,
      });
    },
    async addNote() {
      return auditRow();
    },
    async changeTag(input) {
      return { ...auditRow(), changed_tag_id: input.tagId };
    },
    ...overrides,
  };
}

function collaborationRow(overrides: Record<string, unknown> = {}) {
  return {
    changed_conversation_id: CONVERSATION_ID,
    changed_business_id: "business-a",
    changed_operation: "ASSIGN" as const,
    current_priority: "NORMAL" as const,
    current_assignee_user_id: ASSIGNEE_ID,
    current_unread_count: 0,
    applied: true,
    duplicate: false,
    block_code: null,
    event_id: EVENT_ID,
    ...overrides,
  };
}

function auditRow(overrides: Record<string, unknown> = {}) {
  return {
    changed_conversation_id: CONVERSATION_ID,
    changed_business_id: "business-a",
    applied: true,
    duplicate: false,
    block_code: null,
    event_id: EVENT_ID,
    ...overrides,
  };
}

function actor() {
  return {
    conversationId: CONVERSATION_ID,
    businessId: "business-a",
    actorKind: "BUSINESS_USER" as const,
    actorUsername: "owner",
  };
}

function collaborationCommand() {
  return {
    ...actor(),
    operation: "ASSIGN" as const,
    assigneeUserId: ASSIGNEE_ID,
    idempotencyKey: "assignment-command",
  };
}

function configurationDataSource(
  overrides: Partial<InboxConfigurationDataSource> = {},
): InboxConfigurationDataSource {
  return {
    async businessExists(businessId) {
      return businessId === "business-a";
    },
    async listAssignees() {
      return [
        { id: ASSIGNEE_ID, email: "owner@example.com", display_name: "Owner", role: "OWNER" },
      ];
    },
    async listTags() {
      return [{ id: TAG_ID, name: "VIP", color: "violet" }];
    },
    async listCannedReplies() {
      return [cannedReplyData()];
    },
    async saveCannedReply() {
      return cannedReplyRow();
    },
    ...overrides,
  };
}

function cannedReplyData() {
  return {
    id: REPLY_ID,
    business_id: "business-a",
    title: "Greeting",
    body: "Hello",
    shortcut: "/hello",
    category: "General",
    is_active: true,
    created_at: "2026-07-18T00:00:00.000Z",
    updated_at: "2026-07-18T00:00:00.000Z",
  };
}

function cannedReplyRow(overrides: Record<string, unknown> = {}) {
  const reply = cannedReplyData();
  return {
    changed_reply_id: reply.id,
    changed_business_id: reply.business_id,
    current_title: reply.title,
    current_body: reply.body,
    current_shortcut: reply.shortcut,
    current_category: reply.category,
    current_is_active: reply.is_active,
    current_created_at: reply.created_at,
    current_updated_at: reply.updated_at,
    applied: true,
    duplicate: false,
    block_code: null,
    audit_event_id: EVENT_ID,
    ...overrides,
  };
}

function request(method: string, url: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function captureAuthEnv() {
  return {
    admin: process.env.WA_INTERNAL_ADMIN_SESSION_SECRET,
    dashboard: process.env.WA_DASHBOARD_SESSION_SECRET,
    business: process.env.WA_DASHBOARD_BUSINESS_ID,
  };
}

function restoreAuthEnv(env: ReturnType<typeof captureAuthEnv>) {
  restoreEnv("WA_INTERNAL_ADMIN_SESSION_SECRET", env.admin);
  restoreEnv("WA_DASHBOARD_SESSION_SECRET", env.dashboard);
  restoreEnv("WA_DASHBOARD_BUSINESS_ID", env.business);
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
