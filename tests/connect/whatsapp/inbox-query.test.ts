import assert from "node:assert/strict";
import test from "node:test";

import { createInternalAdminSessionCookie } from "../../../src/features/connect/shared/admin-auth.server.ts";
import { createDashboardSessionCookie } from "../../../src/features/connect/shared/dashboard-auth.server.ts";
import {
  createAdminConversationListHandlers,
  createClientConversationListHandlers,
} from "../../../src/features/connect/shared/inbox-api-handlers.server.ts";
import {
  InboxRequestError,
  decodeInboxCursor,
  parseInboxPageLimit,
  parseInboxSearch,
  type InboxQueryService,
} from "../../../src/features/connect/shared/inbox-query.ts";
import {
  createInboxQueryService,
  type InboxDataSource,
} from "../../../src/features/connect/shared/inbox-query.server.ts";

const CONTACT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CONTACT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CONVERSATION_A = "11111111-1111-4111-8111-111111111111";
const CONVERSATION_B = "22222222-2222-4222-8222-222222222222";
const MESSAGE_A = "33333333-3333-4333-8333-333333333333";
const EVENT_A = "44444444-4444-4444-8444-444444444444";
const TAG_A = "55555555-5555-4555-8555-555555555555";

const conversationRows = [
  conversationRow({
    id: CONVERSATION_A,
    businessId: "business-a",
    businessName: "Business A",
    contactId: CONTACT_A,
    contactName: "Alpha Customer",
    phone: "+96170000001",
    updatedAt: "2026-07-17T12:00:00.000Z",
    unreadCount: 2,
    tagId: TAG_A,
  }),
  conversationRow({
    id: CONVERSATION_B,
    businessId: "business-b",
    businessName: "Business B",
    contactId: CONTACT_B,
    contactName: "Beta Customer",
    phone: "+96170000002",
    updatedAt: "2026-07-17T11:00:00.000Z",
    unreadCount: 0,
  }),
];

test("validates page limits and normalizes PostgREST search control characters", () => {
  assert.equal(parseInboxPageLimit(null), 25);
  assert.equal(parseInboxPageLimit("100"), 100);
  assert.equal(parseInboxSearch("  Alpha, (*) Customer  "), "Alpha Customer");
  assert.throws(() => parseInboxPageLimit("101"), InboxRequestError);
  assert.throws(() => decodeInboxCursor("not-a-cursor"), InboxRequestError);
});

test("lists two businesses with deterministic opaque cursor pagination", async () => {
  const paths: string[] = [];
  const service = createInboxQueryService(createFixtureDataSource(paths));

  const first = await service.listConversations({ limit: 1 });
  assert.equal(first.items.length, 1);
  assert.equal(first.items[0].business.id, "business-a");
  assert.ok(first.nextCursor);

  const decoded = decodeInboxCursor(first.nextCursor!);
  assert.equal(decoded?.id, CONVERSATION_A);

  const second = await service.listConversations({ limit: 1, cursor: first.nextCursor! });
  assert.equal(second.items.length, 1);
  assert.equal(second.items[0].business.id, "business-b");
  assert.match(paths[1], /updated_at/);
  assert.match(paths[1], /id\.lt/);
});

test("applies tenant, status, assignment, unread, search, and tag filters server-side", async () => {
  const paths: string[] = [];
  const service = createInboxQueryService(createFixtureDataSource(paths));

  const result = await service.listConversations({
    businessIds: ["business-a"],
    status: "OPEN",
    assignee: "unassigned",
    unread: true,
    search: "Alpha Customer",
    tagId: TAG_A,
  });

  assert.equal(result.items.length, 1);
  const parsed = parsePath(paths[0]).params;
  assert.equal(parsed.get("business_id"), "eq.business-a");
  assert.equal(parsed.get("status"), "eq.OPEN");
  assert.equal(parsed.get("assignee_user_id"), "is.null");
  assert.equal(parsed.get("unread_count"), "gt.0");
  assert.match(parsed.get("contact.or") || "", /Alpha Customer/);
  assert.equal(parsed.get("contact.matched_tags.tag_id"), `eq.${TAG_A}`);
});

test("returns not found when a client-scoped conversation belongs to another business", async () => {
  const service = createInboxQueryService(createFixtureDataSource([]));
  await assert.rejects(
    service.getConversation({
      conversationId: CONVERSATION_B,
      businessIds: ["business-a"],
    }),
    (error: unknown) => error instanceof InboxRequestError && error.code === "NOT_FOUND",
  );
});

test("merges messages and events into one paginated conversation timeline", async () => {
  const service = createInboxQueryService(createFixtureDataSource([]));
  const detail = await service.getConversation({
    conversationId: CONVERSATION_A,
    businessIds: ["business-a"],
    timelineLimit: 1,
  });

  assert.equal(detail.conversation.contact.displayName, "Alpha Customer");
  assert.equal(detail.timeline.items.length, 1);
  assert.equal(detail.timeline.items[0].kind, "message");
  assert.ok(detail.timeline.nextCursor);
});

test("projects contact conversation history and denies cross-tenant contact ids", async () => {
  const service = createInboxQueryService(createFixtureDataSource([]));
  const detail = await service.getContact({
    contactId: CONTACT_A,
    businessIds: ["business-a"],
    conversationLimit: 10,
  });

  assert.equal(detail.contact.business.id, "business-a");
  assert.equal(detail.contact.tags[0]?.name, "VIP");
  assert.equal(detail.conversations.items.length, 1);
  assert.equal(detail.conversations.items[0].id, CONVERSATION_A);

  await assert.rejects(
    service.getContact({ contactId: CONTACT_A, businessIds: ["business-b"] }),
    (error: unknown) => error instanceof InboxRequestError && error.code === "NOT_FOUND",
  );
});

test("client handlers derive tenant scope from the signed session and reject browser overrides", async () => {
  const previousSecret = process.env.WA_DASHBOARD_SESSION_SECRET;
  const previousBusiness = process.env.WA_DASHBOARD_BUSINESS_ID;
  process.env.WA_DASHBOARD_SESSION_SECRET = "inbox-client-test-secret";
  process.env.WA_DASHBOARD_BUSINESS_ID = "business-a";

  try {
    let capturedBusinessIds: string[] | undefined;
    const service = emptyService({
      listConversations: async (input) => {
        capturedBusinessIds = input.businessIds;
        return { items: [], nextCursor: null };
      },
    });
    const handlers = createClientConversationListHandlers(service);
    const cookie = createDashboardSessionCookie("owner").split(";", 1)[0];

    const response = await handlers.GET({
      request: new Request("https://doubleacode.com/api/connect/client/conversations?status=open", {
        headers: { cookie },
      }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(capturedBusinessIds, ["business-a"]);

    const denied = await handlers.GET({
      request: new Request(
        "https://doubleacode.com/api/connect/client/conversations?businessId=business-b",
        { headers: { cookie } },
      ),
    });
    assert.equal(denied.status, 400);
    assert.equal((await denied.json()).error.code, "INVALID_REQUEST");
  } finally {
    restoreEnv("WA_DASHBOARD_SESSION_SECRET", previousSecret);
    restoreEnv("WA_DASHBOARD_BUSINESS_ID", previousBusiness);
  }
});

test("admin handlers require authentication and keep unexpected failures sanitized", async () => {
  const previousSecret = process.env.WA_INTERNAL_ADMIN_SESSION_SECRET;
  process.env.WA_INTERNAL_ADMIN_SESSION_SECRET = "inbox-admin-test-secret";

  try {
    const service = emptyService({
      listConversations: async () => {
        throw new Error("database hostname and secret diagnostic details");
      },
    });
    const handlers = createAdminConversationListHandlers(service);
    const unauthorized = await handlers.GET({
      request: new Request("https://doubleacode.com/api/connect/admin/conversations"),
    });
    assert.equal(unauthorized.status, 401);

    const cookie = createInternalAdminSessionCookie("admin").split(";", 1)[0];
    const failed = await handlers.GET({
      request: new Request("https://doubleacode.com/api/connect/admin/conversations", {
        headers: { cookie },
      }),
    });
    assert.equal(failed.status, 500);
    const body = await failed.json();
    assert.equal(body.error.code, "INTERNAL_ERROR");
    assert.equal(body.error.message, "Inbox data could not be loaded.");
    assert.doesNotMatch(JSON.stringify(body), /hostname|secret diagnostic/);
  } finally {
    restoreEnv("WA_INTERNAL_ADMIN_SESSION_SECRET", previousSecret);
  }
});

function createFixtureDataSource(paths: string[]): InboxDataSource {
  return async <T>(path: string) => {
    paths.push(path);
    const { table, params } = parsePath(path);
    if (table === "wa_conversations") {
      let rows = [...conversationRows];
      rows = filterBusiness(rows, params.get("business_id"));
      const idFilter = eqValue(params.get("id"));
      if (idFilter) rows = rows.filter((row) => row.id === idFilter);
      if (params.has("or") || params.has("and")) rows = rows.slice(1);
      const limit = Number(params.get("limit") || rows.length);
      return rows.slice(0, limit) as T;
    }
    if (table === "wa_contacts") {
      const contacts = conversationRows.map((row) => ({
        ...row.contact,
        business_id: row.business_id,
        opt_in_source: null,
        opt_in_at: null,
        opt_out_at: null,
        attributes: {},
        created_at: row.created_at,
        updated_at: row.updated_at,
        business: row.business,
      }));
      const scoped = filterBusiness(contacts, params.get("business_id"));
      const idFilter = eqValue(params.get("id"));
      return (idFilter ? scoped.filter((row) => row.id === idFilter) : scoped) as T;
    }
    if (table === "wa_conversation_messages") {
      return [
        {
          id: MESSAGE_A,
          direction: "INBOUND",
          sender_type: "CUSTOMER",
          sender_user_id: null,
          message_type: "TEXT",
          body: "Hello",
          media_asset_id: null,
          template_name: null,
          reply_to_message_id: null,
          status: "RECEIVED",
          error_code: null,
          error_message: null,
          received_at: "2026-07-17T12:01:00.000Z",
          sent_at: null,
          delivered_at: null,
          read_at: null,
          created_at: "2026-07-17T12:01:00.000Z",
        },
      ] as T;
    }
    if (table === "wa_conversation_events") {
      return [
        {
          id: EVENT_A,
          event_type: "FLOW_STARTED",
          actor_type: "SYSTEM",
          actor_user_id: null,
          payload: { flowVersionId: "flow-version-a", rawProviderPayload: "must-not-leak" },
          created_at: "2026-07-17T12:00:30.000Z",
        },
      ] as T;
    }
    throw new Error(`Unexpected fixture table: ${table}`);
  };
}

function conversationRow(input: {
  id: string;
  businessId: string;
  businessName: string;
  contactId: string;
  contactName: string;
  phone: string;
  updatedAt: string;
  unreadCount: number;
  tagId?: string;
}) {
  return {
    id: input.id,
    business_id: input.businessId,
    contact_id: input.contactId,
    connection_id: `connection-${input.businessId}`,
    channel: "WHATSAPP" as const,
    status: "OPEN" as const,
    priority: "NORMAL" as const,
    assignee_user_id: null,
    unread_count: input.unreadCount,
    last_message_preview: "Latest message",
    last_message_at: input.updatedAt,
    last_customer_message_at: input.updatedAt,
    last_agent_message_at: null,
    sla_due_at: null,
    snoozed_until: null,
    opened_at: input.updatedAt,
    pending_at: null,
    closed_at: null,
    business_flow_id: null,
    flow_version_id: null,
    current_node_id: null,
    created_at: input.updatedAt,
    updated_at: input.updatedAt,
    business: { id: input.businessId, name: input.businessName },
    contact: {
      id: input.contactId,
      phone_e164: input.phone,
      display_name: input.contactName,
      lifecycle: "LEAD" as const,
      language: "en",
      opt_in_status: "UNKNOWN" as const,
      first_seen_at: input.updatedAt,
      last_seen_at: input.updatedAt,
      contact_tags: input.tagId ? [{ tag: { id: input.tagId, name: "VIP", color: "violet" } }] : [],
    },
    assignee: null,
  };
}

function parsePath(path: string) {
  const url = new URL(path, "https://supabase.test/rest/v1");
  return { table: url.pathname.split("/").at(-1)!, params: url.searchParams };
}

function eqValue(value: string | null) {
  return value?.startsWith("eq.") ? value.slice(3) : undefined;
}

function filterBusiness<T extends { business_id: string }>(rows: T[], value: string | null) {
  if (!value) return rows;
  if (value.startsWith("eq.")) return rows.filter((row) => row.business_id === value.slice(3));
  if (value.startsWith("in.(") && value.endsWith(")")) {
    const ids = new Set(value.slice(4, -1).split(","));
    return rows.filter((row) => ids.has(row.business_id));
  }
  return [];
}

function emptyService(overrides: Partial<InboxQueryService>): InboxQueryService {
  return {
    listConversations: async () => ({ items: [], nextCursor: null }),
    getConversation: async () => {
      throw new Error("Not implemented in test");
    },
    listContacts: async () => ({ items: [], nextCursor: null }),
    getContact: async () => {
      throw new Error("Not implemented in test");
    },
    ...overrides,
  };
}

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
