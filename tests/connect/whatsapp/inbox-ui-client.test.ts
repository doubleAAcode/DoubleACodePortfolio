import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  InboxApiError,
  createInboxIdempotencyKey,
  getInboxConversations,
  sendInboxTextReply,
  updateInboxConversation,
} from "../../../src/features/connect/flow-manager-ui/inbox-client.ts";

test("admin inbox list adapter sends only supported server filters", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  let capturedUrl = "";
  globalThis.fetch = async (input) => {
    capturedUrl = String(input);
    return Response.json({ ok: true, data: { items: [], nextCursor: null } });
  };

  const page = await getInboxConversations("admin", {
    search: "Rania",
    status: "OPEN",
    assignee: "unassigned",
    unread: true,
    tagId: "55555555-5555-4555-8555-555555555555",
    limit: 50,
    cursor: "opaque-cursor",
  });

  assert.deepEqual(page, { items: [], nextCursor: null });
  const url = new URL(capturedUrl, "https://doubleacode.com");
  assert.equal(url.pathname, "/api/connect/admin/conversations");
  assert.equal(url.searchParams.get("search"), "Rania");
  assert.equal(url.searchParams.get("status"), "OPEN");
  assert.equal(url.searchParams.get("assignee"), "unassigned");
  assert.equal(url.searchParams.get("unread"), "true");
  assert.equal(url.searchParams.get("tag"), "55555555-5555-4555-8555-555555555555");
  assert.equal(url.searchParams.get("limit"), "50");
  assert.equal(url.searchParams.get("cursor"), "opaque-cursor");
  assert.equal(url.searchParams.has("businessId"), false);
});

test("inbox mutation adapters send idempotent commands to the selected audience", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  const requests: Array<{ url: string; method: string; body: unknown }> = [];
  globalThis.fetch = async (input, init) => {
    requests.push({
      url: String(input),
      method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    return Response.json({
      ok: true,
      data: {
        outboxId: "outbox-id",
        messageId: "message-id",
        status: "SENT",
        attemptNumber: 1,
        duplicate: false,
        retryable: false,
        serviceWindowExpiresAt: "2026-07-19T12:00:00.000Z",
      },
    });
  };

  await sendInboxTextReply("admin", "conversation-id", "Hello", "reply-key-123");
  await updateInboxConversation(
    "client",
    "conversation-id",
    { status: "PENDING" },
    "status-key-123",
  );

  assert.deepEqual(requests[0], {
    url: "/api/connect/admin/conversations/conversation-id/messages",
    method: "POST",
    body: { body: "Hello", idempotencyKey: "reply-key-123" },
  });
  assert.deepEqual(requests[1], {
    url: "/api/connect/client/conversations/conversation-id",
    method: "PATCH",
    body: { status: "PENDING", idempotencyKey: "status-key-123" },
  });
  assert.match(createInboxIdempotencyKey("send reply"), /^ui-send-reply-[A-Za-z0-9-]+$/);
});

test("inbox adapter preserves sanitized server error codes for visible UI failures", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async () =>
    Response.json(
      {
        ok: false,
        error: {
          code: "HUMAN_SEND_DISABLED",
          message: "Human WhatsApp sending is disabled for this release.",
        },
      },
      { status: 503 },
    );

  await assert.rejects(
    sendInboxTextReply("admin", "conversation-id", "Hello", "reply-key-123"),
    (error: unknown) => {
      assert.ok(error instanceof InboxApiError);
      assert.equal(error.code, "HUMAN_SEND_DISABLED");
      assert.equal(error.status, 503);
      return true;
    },
  );
});

test("promoted admin Live Ops routes no longer import preview conversation data", () => {
  const layout = readFileSync("src/routes/connect.admin.inbox.tsx", "utf8");
  const route = readFileSync("src/routes/connect.admin.inbox.$conversationId.tsx", "utf8");
  const detail = readFileSync(
    "src/features/connect/flow-manager-ui/inbox-conversation-view.tsx",
    "utf8",
  );

  for (const source of [layout, route, detail]) {
    assert.doesNotMatch(source, /preview-data\/mock-extra/);
    assert.doesNotMatch(source, /preview-toast/);
  }
  assert.match(layout, /getInboxConversations/);
  assert.match(detail, /getInboxConversation/);
  assert.match(detail, /sendInboxTextReply/);
  assert.match(detail, /updateInboxConversation/);
  assert.match(detail, /addInboxConversationNote/);
  assert.match(detail, /changeInboxConversationTag/);
});
