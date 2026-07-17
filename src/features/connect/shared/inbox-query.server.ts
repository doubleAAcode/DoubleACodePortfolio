import "@tanstack/react-start/server-only";

import { supabaseServerRest } from "../../../lib/supabase/server-rest.server.ts";
import {
  decodeInboxCursor,
  encodeInboxCursor,
  inboxNotFound,
  parseInboxBusinessId,
  parseInboxPageLimit,
  parseInboxUuid,
  type InboxContactDetail,
  type InboxContactDetailInput,
  type InboxContactListInput,
  type InboxContactReference,
  type InboxContactSummary,
  type InboxConversationDetail,
  type InboxConversationDetailInput,
  type InboxConversationListInput,
  type InboxConversationSummary,
  type InboxEventTimelineItem,
  type InboxMessageTimelineItem,
  type InboxPage,
  type InboxQueryService,
  type InboxTag,
  type InboxTimelineItem,
} from "./inbox-query.ts";

export type InboxDataSource = <T>(path: string) => Promise<T>;

type TagRelationRow = {
  tag:
    | { id: string; name: string; color: string }
    | Array<{ id: string; name: string; color: string }>
    | null;
};

type BusinessRelationRow = { id: string; name: string } | null;

type UserRelationRow = {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
} | null;

type ContactRelationRow = {
  id: string;
  phone_e164: string;
  display_name: string;
  lifecycle: InboxContactReference["lifecycle"];
  language: string | null;
  opt_in_status: InboxContactReference["optInStatus"];
  first_seen_at: string;
  last_seen_at: string;
  contact_tags?: TagRelationRow[] | null;
};

type ConversationRow = {
  id: string;
  business_id: string;
  contact_id: string;
  connection_id: string | null;
  channel: "WHATSAPP";
  status: InboxConversationSummary["status"];
  priority: InboxConversationSummary["priority"];
  assignee_user_id: string | null;
  unread_count: number;
  last_message_preview: string | null;
  last_message_at: string | null;
  last_customer_message_at: string | null;
  last_agent_message_at: string | null;
  sla_due_at: string | null;
  snoozed_until: string | null;
  opened_at: string;
  pending_at: string | null;
  closed_at: string | null;
  business_flow_id: string | null;
  flow_version_id: string | null;
  current_node_id: string | null;
  created_at: string;
  updated_at: string;
  business: BusinessRelationRow;
  contact: ContactRelationRow;
  assignee: UserRelationRow;
};

type ContactRow = {
  id: string;
  business_id: string;
  phone_e164: string;
  display_name: string;
  lifecycle: InboxContactReference["lifecycle"];
  language: string | null;
  opt_in_status: InboxContactReference["optInStatus"];
  opt_in_source: string | null;
  opt_in_at: string | null;
  opt_out_at: string | null;
  attributes: Record<string, unknown> | null;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
  business: BusinessRelationRow;
  contact_tags?: TagRelationRow[] | null;
};

type MessageRow = {
  id: string;
  direction: InboxMessageTimelineItem["direction"];
  sender_type: InboxMessageTimelineItem["senderType"];
  sender_user_id: string | null;
  message_type: InboxMessageTimelineItem["messageType"];
  body: string | null;
  media_asset_id: string | null;
  template_name: string | null;
  reply_to_message_id: string | null;
  status: string;
  error_code: string | null;
  error_message: string | null;
  received_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
};

type EventRow = {
  id: string;
  event_type: string;
  actor_type: InboxEventTimelineItem["actorType"];
  actor_user_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

const TAG_SELECT =
  "contact_tags:wa_contact_tags!wa_contact_tags_business_id_contact_id_fkey(tag:wa_tags!wa_contact_tags_business_id_tag_id_fkey(id,name,color))";
const MATCHED_TAG_SELECT =
  "matched_tags:wa_contact_tags!wa_contact_tags_business_id_contact_id_fkey!inner(tag_id)";

export function createInboxQueryService(
  dataSource: InboxDataSource = <T>(path: string) => supabaseServerRest<T>(path),
): InboxQueryService {
  async function listConversations(
    input: InboxConversationListInput,
  ): Promise<InboxPage<InboxConversationSummary>> {
    const limit = normalizeLimit(input.limit);
    const rows = await fetchConversationRows({ ...input, limit: limit + 1 });
    const hasMore = rows.length > limit;
    const pageRows = rows.slice(0, limit);
    return {
      items: pageRows.map(toConversationSummary),
      nextCursor: hasMore ? cursorFromLast(pageRows) : null,
    };
  }

  async function getConversation(
    input: InboxConversationDetailInput,
  ): Promise<InboxConversationDetail> {
    const conversationId = parseInboxUuid(input.conversationId, "conversationId");
    const rows = await fetchConversationRows({
      businessIds: input.businessIds,
      conversationId,
      limit: 1,
    });
    const row = rows[0];
    if (!row) throw inboxNotFound("Conversation");

    return {
      conversation: toConversationSummary(row),
      timeline: await listTimeline({
        businessId: row.business_id,
        conversationId,
        limit: input.timelineLimit,
        cursor: input.timelineCursor,
      }),
    };
  }

  async function listContacts(
    input: InboxContactListInput,
  ): Promise<InboxPage<InboxContactSummary>> {
    const limit = normalizeLimit(input.limit);
    const rows = await fetchContactRows({ ...input, limit: limit + 1 });
    const hasMore = rows.length > limit;
    const pageRows = rows.slice(0, limit);
    return {
      items: pageRows.map(toContactSummary),
      nextCursor: hasMore ? cursorFromLast(pageRows) : null,
    };
  }

  async function getContact(input: InboxContactDetailInput): Promise<InboxContactDetail> {
    const contactId = parseInboxUuid(input.contactId, "contactId");
    const rows = await fetchContactRows({
      businessIds: input.businessIds,
      contactId,
      limit: 1,
    });
    const row = rows[0];
    if (!row) throw inboxNotFound("Contact");

    return {
      contact: toContactSummary(row),
      conversations: await listConversations({
        businessIds: [row.business_id],
        contactId,
        limit: input.conversationLimit,
        cursor: input.conversationCursor,
      }),
    };
  }

  async function fetchConversationRows(
    input: InboxConversationListInput & { conversationId?: string; limit: number },
  ) {
    const params = new URLSearchParams();
    params.set("select", buildConversationSelect(Boolean(input.tagId)));
    params.set("order", "updated_at.desc,id.desc");
    params.set("limit", String(input.limit));
    applyBusinessScope(params, input.businessIds);

    if (input.conversationId) params.set("id", `eq.${input.conversationId}`);
    if (input.contactId)
      params.set("contact_id", `eq.${parseInboxUuid(input.contactId, "contactId")}`);
    if (input.status) params.set("status", `eq.${input.status}`);
    if (input.assignee === "unassigned") {
      params.set("assignee_user_id", "is.null");
    } else if (input.assignee) {
      params.set("assignee_user_id", `eq.${parseInboxUuid(input.assignee, "assignee")}`);
    }
    if (input.unread !== undefined) {
      params.set("unread_count", input.unread ? "gt.0" : "eq.0");
    }
    if (input.search) {
      params.set(
        "contact.or",
        `(display_name.ilike.*${input.search}*,phone_e164.ilike.*${input.search}*)`,
      );
    }
    if (input.tagId) {
      params.set("contact.matched_tags.tag_id", `eq.${parseInboxUuid(input.tagId, "tag")}`);
    }
    applyCursor(params, input.cursor);
    return dataSource<ConversationRow[]>(`/wa_conversations?${params.toString()}`);
  }

  async function fetchContactRows(
    input: InboxContactListInput & { contactId?: string; limit: number },
  ) {
    const params = new URLSearchParams();
    params.set("select", buildContactSelect(Boolean(input.tagId)));
    params.set("order", "updated_at.desc,id.desc");
    params.set("limit", String(input.limit));
    applyBusinessScope(params, input.businessIds);

    if (input.contactId) params.set("id", `eq.${input.contactId}`);
    if (input.lifecycle) params.set("lifecycle", `eq.${input.lifecycle}`);
    if (input.search) {
      params.set("or", `(display_name.ilike.*${input.search}*,phone_e164.ilike.*${input.search}*)`);
    }
    if (input.tagId) {
      params.set("matched_tags.tag_id", `eq.${parseInboxUuid(input.tagId, "tag")}`);
    }
    applyCursor(params, input.cursor);
    return dataSource<ContactRow[]>(`/wa_contacts?${params.toString()}`);
  }

  async function listTimeline({
    businessId,
    conversationId,
    limit: requestedLimit,
    cursor,
  }: {
    businessId: string;
    conversationId: string;
    limit?: number;
    cursor?: string;
  }): Promise<InboxPage<InboxTimelineItem>> {
    const limit = normalizeLimit(requestedLimit, 50);
    const queryLimit = limit + 1;
    const messageParams = timelineParams({ businessId, conversationId, limit: queryLimit, cursor });
    messageParams.set(
      "select",
      "id,direction,sender_type,sender_user_id,message_type,body,media_asset_id,template_name,reply_to_message_id,status,error_code,error_message,received_at,sent_at,delivered_at,read_at,created_at",
    );
    const eventParams = timelineParams({ businessId, conversationId, limit: queryLimit, cursor });
    eventParams.set("select", "id,event_type,actor_type,actor_user_id,payload,created_at");

    const [messages, events] = await Promise.all([
      dataSource<MessageRow[]>(`/wa_conversation_messages?${messageParams.toString()}`),
      dataSource<EventRow[]>(`/wa_conversation_events?${eventParams.toString()}`),
    ]);
    const merged: InboxTimelineItem[] = [
      ...messages.map(toMessageTimelineItem),
      ...events.map(toEventTimelineItem),
    ].sort(compareTimelineDesc);
    const hasMore = merged.length > limit;
    const items = merged.slice(0, limit);
    return {
      items,
      nextCursor:
        hasMore && items.length
          ? encodeInboxCursor(items.at(-1)!.createdAt, items.at(-1)!.id)
          : null,
    };
  }

  return { listConversations, getConversation, listContacts, getContact };
}

function buildConversationSelect(filterByTag: boolean) {
  const contactRelations = [TAG_SELECT, filterByTag ? MATCHED_TAG_SELECT : ""]
    .filter(Boolean)
    .join(",");
  return [
    "id,business_id,contact_id,connection_id,channel,status,priority,assignee_user_id,unread_count,last_message_preview,last_message_at,last_customer_message_at,last_agent_message_at,sla_due_at,snoozed_until,opened_at,pending_at,closed_at,business_flow_id,flow_version_id,current_node_id,created_at,updated_at",
    "business:wa_businesses!wa_conversations_business_id_fkey(id,name)",
    `contact:wa_contacts!wa_conversations_business_id_contact_id_fkey!inner(id,phone_e164,display_name,lifecycle,language,opt_in_status,first_seen_at,last_seen_at,${contactRelations})`,
    "assignee:wa_business_users!wa_conversations_business_id_assignee_user_id_fkey(id,email,display_name,role)",
  ].join(",");
}

function buildContactSelect(filterByTag: boolean) {
  return [
    "id,business_id,phone_e164,display_name,lifecycle,language,opt_in_status,opt_in_source,opt_in_at,opt_out_at,attributes,first_seen_at,last_seen_at,created_at,updated_at",
    "business:wa_businesses!wa_contacts_business_id_fkey(id,name)",
    TAG_SELECT,
    filterByTag ? MATCHED_TAG_SELECT : "",
  ]
    .filter(Boolean)
    .join(",");
}

function applyBusinessScope(params: URLSearchParams, businessIds: string[] | undefined) {
  if (!businessIds?.length) return;
  const normalized = [...new Set(businessIds.map((id) => parseInboxBusinessId(id)))];
  params.set(
    "business_id",
    normalized.length === 1 ? `eq.${normalized[0]}` : `in.(${normalized.join(",")})`,
  );
}

function applyCursor(params: URLSearchParams, cursorValue: string | undefined) {
  const cursor = decodeInboxCursor(cursorValue);
  if (!cursor) return;
  params.set(
    "and",
    `(or(updated_at.lt.${cursor.at},and(updated_at.eq.${cursor.at},id.lt.${cursor.id})))`,
  );
}

function timelineParams({
  businessId,
  conversationId,
  limit,
  cursor,
}: {
  businessId: string;
  conversationId: string;
  limit: number;
  cursor?: string;
}) {
  const params = new URLSearchParams();
  params.set("business_id", `eq.${parseInboxBusinessId(businessId)}`);
  params.set("conversation_id", `eq.${parseInboxUuid(conversationId, "conversationId")}`);
  params.set("order", "created_at.desc,id.desc");
  params.set("limit", String(limit));
  const decoded = decodeInboxCursor(cursor);
  if (decoded) {
    params.set(
      "and",
      `(or(created_at.lt.${decoded.at},and(created_at.eq.${decoded.at},id.lt.${decoded.id})))`,
    );
  }
  return params;
}

function normalizeLimit(limit: number | undefined, fallback = 25) {
  return parseInboxPageLimit(limit === undefined ? null : String(limit), fallback);
}

function cursorFromLast(rows: Array<{ id: string; updated_at: string }>) {
  const last = rows.at(-1);
  return last ? encodeInboxCursor(last.updated_at, last.id) : null;
}

function toConversationSummary(row: ConversationRow): InboxConversationSummary {
  return {
    id: row.id,
    business: {
      id: row.business?.id ?? row.business_id,
      name: row.business?.name ?? row.business_id,
    },
    contact: toContactReference(row.contact),
    connectionId: row.connection_id,
    channel: "WHATSAPP",
    status: row.status,
    priority: row.priority,
    assignee: row.assignee
      ? {
          id: row.assignee.id,
          email: row.assignee.email,
          displayName: row.assignee.display_name,
          role: row.assignee.role,
        }
      : null,
    unreadCount: row.unread_count,
    lastMessagePreview: row.last_message_preview,
    lastMessageAt: row.last_message_at,
    lastCustomerMessageAt: row.last_customer_message_at,
    lastAgentMessageAt: row.last_agent_message_at,
    slaDueAt: row.sla_due_at,
    snoozedUntil: row.snoozed_until,
    openedAt: row.opened_at,
    pendingAt: row.pending_at,
    closedAt: row.closed_at,
    businessFlowId: row.business_flow_id,
    flowVersionId: row.flow_version_id,
    currentNodeId: row.current_node_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toContactReference(row: ContactRelationRow): InboxContactReference {
  return {
    id: row.id,
    phoneE164: row.phone_e164,
    displayName: row.display_name,
    lifecycle: row.lifecycle,
    language: row.language,
    optInStatus: row.opt_in_status,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    tags: mapTags(row.contact_tags),
  };
}

function toContactSummary(row: ContactRow): InboxContactSummary {
  return {
    ...toContactReference(row),
    business: {
      id: row.business?.id ?? row.business_id,
      name: row.business?.name ?? row.business_id,
    },
    attributes: isRecord(row.attributes) ? row.attributes : {},
    optInSource: row.opt_in_source,
    optInAt: row.opt_in_at,
    optOutAt: row.opt_out_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTags(rows: TagRelationRow[] | null | undefined): InboxTag[] {
  const tags = (rows ?? []).flatMap((row) => {
    const relation = Array.isArray(row.tag) ? row.tag[0] : row.tag;
    return relation ? [{ id: relation.id, name: relation.name, color: relation.color }] : [];
  });
  return tags.sort((left, right) => left.name.localeCompare(right.name));
}

function toMessageTimelineItem(row: MessageRow): InboxMessageTimelineItem {
  return {
    kind: "message",
    id: row.id,
    createdAt: row.created_at,
    direction: row.direction,
    senderType: row.sender_type,
    senderUserId: row.sender_user_id,
    messageType: row.message_type,
    body: row.body,
    mediaAssetId: row.media_asset_id,
    templateName: row.template_name,
    replyToMessageId: row.reply_to_message_id,
    status: row.status,
    errorCode: row.error_code,
    errorMessage: sanitizeStoredError(row.error_message),
    receivedAt: row.received_at,
    sentAt: row.sent_at,
    deliveredAt: row.delivered_at,
    readAt: row.read_at,
  };
}

function toEventTimelineItem(row: EventRow): InboxEventTimelineItem {
  return {
    kind: "event",
    id: row.id,
    createdAt: row.created_at,
    eventType: row.event_type,
    actorType: row.actor_type,
    actorUserId: row.actor_user_id,
    payload: sanitizeEventPayload(row.payload),
  };
}

function compareTimelineDesc(left: InboxTimelineItem, right: InboxTimelineItem) {
  const timestampOrder = Date.parse(right.createdAt) - Date.parse(left.createdAt);
  return timestampOrder || right.id.localeCompare(left.id);
}

const SAFE_EVENT_PAYLOAD_KEYS = new Set([
  "from",
  "to",
  "status",
  "reason",
  "source",
  "flowId",
  "flowVersionId",
  "currentNodeId",
  "assigneeUserId",
  "tagId",
]);

function sanitizeEventPayload(payload: Record<string, unknown> | null) {
  if (!isRecord(payload)) return {};
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!SAFE_EVENT_PAYLOAD_KEYS.has(key)) continue;
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      result[key] = value;
    }
  }
  return result;
}

function sanitizeStoredError(value: string | null) {
  if (!value) return null;
  return value.replace(/\s+/g, " ").trim().slice(0, 500) || null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
