import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  InboxApiError,
  createInboxIdempotencyKey,
  getInboxContact,
  getInboxContacts,
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

test("contact adapters preserve audience scope, filters, and detail pagination", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  const urls: string[] = [];
  globalThis.fetch = async (input) => {
    urls.push(String(input));
    return Response.json({
      ok: true,
      data:
        urls.length === 1 ? { items: [], nextCursor: null } : { contact: {}, conversations: {} },
    });
  };

  await getInboxContacts("client", {
    search: "Hussein",
    lifecycle: "CUSTOMER",
    tagId: "55555555-5555-4555-8555-555555555555",
    limit: 50,
    cursor: "contact-cursor",
  });
  await getInboxContact("admin", "contact/id", 25);

  const listUrl = new URL(urls[0], "https://doubleacode.com");
  assert.equal(listUrl.pathname, "/api/connect/client/contacts");
  assert.equal(listUrl.searchParams.get("search"), "Hussein");
  assert.equal(listUrl.searchParams.get("lifecycle"), "CUSTOMER");
  assert.equal(listUrl.searchParams.get("tag"), "55555555-5555-4555-8555-555555555555");
  assert.equal(listUrl.searchParams.get("limit"), "50");
  assert.equal(listUrl.searchParams.get("cursor"), "contact-cursor");
  assert.equal(listUrl.searchParams.has("businessId"), false);
  assert.equal(urls[1], "/api/connect/admin/contacts/contact%2Fid?limit=25");
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

test("promoted client Inbox keeps Lovable future controls but removes preview records", () => {
  const route = readFileSync("src/routes/connect/client/inbox.tsx", "utf8");
  const workspace = readFileSync(
    "src/features/connect/flow-manager-ui/components/workspace-switcher.tsx",
    "utf8",
  );
  const palette = readFileSync(
    "src/features/connect/flow-manager-ui/components/command-palette.tsx",
    "utf8",
  );
  const aiPanel = readFileSync(
    "src/features/connect/flow-manager-ui/components/ai-copilot-panel.tsx",
    "utf8",
  );

  for (const source of [route, workspace, palette, aiPanel]) {
    assert.doesNotMatch(source, /preview-data\/mock-client/);
    assert.doesNotMatch(source, /preview-toast/);
  }
  assert.match(route, /getInboxConversations\("client"/);
  assert.match(route, /InboxConversationView/);
  assert.match(route, /Instagram/);
  assert.match(route, /FutureLabel/);
  assert.match(workspace, /useClientWorkspaceSummary/);
  assert.match(palette, /getInboxConversations/);
  assert.match(aiPanel, /AI-assisted replies and conversation insights/);
});

test("promoted Contacts routes use real adapters and retain explicit Future controls", () => {
  const adminList = readFileSync("src/routes/connect.admin.contacts.index.tsx", "utf8");
  const adminDetail = readFileSync("src/routes/connect.admin.contacts.$contactId.tsx", "utf8");
  const clientList = readFileSync("src/routes/connect/client/contacts.tsx", "utf8");

  for (const source of [adminList, adminDetail, clientList]) {
    assert.doesNotMatch(source, /preview-data\/mock-extra/);
    assert.doesNotMatch(source, /preview-toast/);
    assert.match(source, /Future/);
  }
  assert.match(adminList, /getInboxContacts\("admin"/);
  assert.match(adminDetail, /getInboxContact\("admin"/);
  assert.match(adminDetail, /Conversation history/);
  assert.match(clientList, /getInboxContacts\("client"/);
  assert.match(clientList, /Instagram contacts/);
});
