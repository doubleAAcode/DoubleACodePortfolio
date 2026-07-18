import "@tanstack/react-start/server-only";

import { supabaseServerRest } from "../../../lib/supabase/server-rest.server.ts";

import {
  ConversationOperationsError,
  normalizeConversationCollaborationCommand,
  normalizeConversationLifecycleCommand,
  normalizeConversationNoteCommand,
  normalizeConversationTagCommand,
  type ConversationAuditResult,
  type ConversationCollaborationCommand,
  type ConversationCollaborationResult,
  type ConversationCommandService,
  type ConversationLifecycleCommand,
  type ConversationLifecycleProcessor,
  type ConversationLifecycleResult,
  type ConversationNoteCommand,
  type ConversationTagCommand,
  type ConversationTagResult,
} from "./conversation-operations.ts";
import { InboxRequestError } from "./inbox-query.ts";

type ConversationScopeRow = {
  id: string;
  business_id: string;
};

type LifecycleResultRow = {
  changed_conversation_id: string;
  changed_business_id: string;
  previous_status: ConversationLifecycleResult["previousStatus"];
  current_status: ConversationLifecycleResult["status"];
  current_snoozed_until: string | null;
  applied: boolean;
  duplicate: boolean;
  block_code: string | null;
  event_id: string | null;
};

type AwakenedConversationRow = {
  awakened_conversation_id: string;
  awakened_business_id: string;
  awakened_event_id: string;
};

type CollaborationResultRow = {
  changed_conversation_id: string;
  changed_business_id: string;
  changed_operation: ConversationCollaborationResult["operation"];
  current_priority: ConversationCollaborationResult["priority"] | null;
  current_assignee_user_id: string | null;
  current_unread_count: number | null;
  applied: boolean;
  duplicate: boolean;
  block_code: string | null;
  event_id: string | null;
};

type AuditResultRow = {
  changed_conversation_id: string;
  changed_business_id: string;
  applied: boolean;
  duplicate: boolean;
  block_code: string | null;
  event_id: string | null;
};

type TagResultRow = AuditResultRow & { changed_tag_id: string };

export type ConversationOperationsDataSource = {
  resolveConversation(input: {
    conversationId: string;
    businessId?: string;
  }): Promise<ConversationScopeRow | undefined>;
  changeLifecycle(input: {
    businessId: string;
    conversationId: string;
    status: ConversationLifecycleResult["status"];
    snoozedUntil?: string;
    idempotencyKey: string;
    actorKind: ConversationLifecycleCommand["actorKind"];
    actorUsername: string;
  }): Promise<LifecycleResultRow>;
  wakeDueSnoozed(input: { limit: number }): Promise<AwakenedConversationRow[]>;
  changeCollaboration(input: {
    businessId: string;
    conversationId: string;
    operation: ConversationCollaborationCommand["operation"];
    priority?: ConversationCollaborationCommand["priority"];
    assigneeUserId?: string;
    unread?: boolean;
    idempotencyKey: string;
    actorKind: ConversationCollaborationCommand["actorKind"];
    actorUsername: string;
  }): Promise<CollaborationResultRow>;
  addNote(input: {
    businessId: string;
    conversationId: string;
    note: string;
    idempotencyKey: string;
    actorKind: ConversationNoteCommand["actorKind"];
    actorUsername: string;
  }): Promise<AuditResultRow>;
  changeTag(input: {
    businessId: string;
    conversationId: string;
    tagId: string;
    operation: ConversationTagCommand["operation"];
    idempotencyKey: string;
    actorKind: ConversationTagCommand["actorKind"];
    actorUsername: string;
  }): Promise<TagResultRow>;
};

export type ConversationOperationsDependencies = {
  dataSource?: ConversationOperationsDataSource;
  now?: () => Date;
};

export function createConversationOperationsService(
  dependencies: ConversationOperationsDependencies = {},
): ConversationCommandService {
  const dataSource = dependencies.dataSource ?? createConversationOperationsDataSource();
  const now = dependencies.now ?? (() => new Date());

  return {
    async changeLifecycle(command) {
      const input = normalizeConversationLifecycleCommand(command);
      validateSnoozeWindow(input.snoozedUntil, now());

      const conversation = await dataSource.resolveConversation({
        conversationId: input.conversationId,
        businessId: input.businessId,
      });
      if (!conversation) {
        throw new InboxRequestError("NOT_FOUND", "Conversation was not found.", 404);
      }

      const row = await dataSource.changeLifecycle({
        businessId: conversation.business_id,
        conversationId: conversation.id,
        status: input.status,
        snoozedUntil: input.snoozedUntil,
        idempotencyKey: input.idempotencyKey,
        actorKind: input.actorKind,
        actorUsername: input.actorUsername,
      });
      if (row.block_code === "IDEMPOTENCY_CONFLICT") {
        throw new ConversationOperationsError(
          "IDEMPOTENCY_CONFLICT",
          "This idempotency key was already used for another lifecycle change.",
        );
      }
      if (row.block_code === "ACTIVE_CONVERSATION_EXISTS") {
        throw new ConversationOperationsError(
          "ACTIVE_CONVERSATION_EXISTS",
          "A newer active conversation already exists for this contact.",
        );
      }
      if (row.block_code === "CONVERSATION_CLOSED") {
        throw new ConversationOperationsError(
          "CONVERSATION_CLOSED",
          "Reopen the conversation before changing it to another active status.",
        );
      }
      return {
        conversationId: row.changed_conversation_id,
        businessId: row.changed_business_id,
        previousStatus: row.previous_status,
        status: row.current_status,
        snoozedUntil: row.current_snoozed_until,
        applied: row.applied,
        duplicate: row.duplicate,
        eventId: row.event_id,
      };
    },
    async changeCollaboration(command) {
      const input = normalizeConversationCollaborationCommand(command);
      const conversation = await resolveConversation(dataSource, input);
      const row = await dataSource.changeCollaboration({
        businessId: conversation.business_id,
        conversationId: conversation.id,
        operation: input.operation,
        priority: input.priority,
        assigneeUserId: input.assigneeUserId,
        unread: input.unread,
        idempotencyKey: input.idempotencyKey,
        actorKind: input.actorKind,
        actorUsername: input.actorUsername,
      });
      throwForCollaborationBlock(row.block_code);
      if (!row.current_priority || row.current_unread_count == null) {
        throw new Error("Conversation collaboration change returned incomplete state.");
      }
      return {
        conversationId: row.changed_conversation_id,
        businessId: row.changed_business_id,
        operation: row.changed_operation,
        priority: row.current_priority,
        assigneeUserId: row.current_assignee_user_id,
        unreadCount: row.current_unread_count,
        applied: row.applied,
        duplicate: row.duplicate,
        eventId: row.event_id,
      } satisfies ConversationCollaborationResult;
    },
    async addNote(command) {
      const input = normalizeConversationNoteCommand(command);
      const conversation = await resolveConversation(dataSource, input);
      const row = await dataSource.addNote({
        businessId: conversation.business_id,
        conversationId: conversation.id,
        note: input.note,
        idempotencyKey: input.idempotencyKey,
        actorKind: input.actorKind,
        actorUsername: input.actorUsername,
      });
      throwForCollaborationBlock(row.block_code);
      return mapAuditResult(row);
    },
    async changeTag(command) {
      const input = normalizeConversationTagCommand(command);
      const conversation = await resolveConversation(dataSource, input);
      const row = await dataSource.changeTag({
        businessId: conversation.business_id,
        conversationId: conversation.id,
        tagId: input.tagId,
        operation: input.operation,
        idempotencyKey: input.idempotencyKey,
        actorKind: input.actorKind,
        actorUsername: input.actorUsername,
      });
      throwForCollaborationBlock(row.block_code);
      return { ...mapAuditResult(row), tagId: row.changed_tag_id } satisfies ConversationTagResult;
    },
  };
}

export function createConversationLifecycleProcessor(
  dataSource = createConversationOperationsDataSource(),
): ConversationLifecycleProcessor {
  return {
    async processDue(input = {}) {
      const limit = input.limit ?? 50;
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        throw new InboxRequestError(
          "INVALID_REQUEST",
          "limit must be an integer between 1 and 100.",
          400,
        );
      }
      const awakened = await dataSource.wakeDueSnoozed({ limit });
      return { awakened: awakened.length };
    },
  };
}

export function createConversationOperationsDataSource(): ConversationOperationsDataSource {
  return {
    async resolveConversation({ conversationId, businessId }) {
      const scope = businessId ? `&business_id=eq.${encodeURIComponent(businessId)}` : "";
      const rows = await supabaseServerRest<ConversationScopeRow[]>(
        `/wa_conversations?select=id,business_id&id=eq.${encodeURIComponent(conversationId)}${scope}&limit=1`,
      );
      return rows[0];
    },
    async changeLifecycle(input) {
      const rows = await supabaseServerRest<LifecycleResultRow[]>(
        "/rpc/wa_change_conversation_lifecycle",
        {
          method: "POST",
          body: JSON.stringify({
            p_business_id: input.businessId,
            p_conversation_id: input.conversationId,
            p_status: input.status,
            p_idempotency_key: input.idempotencyKey,
            p_actor_kind: input.actorKind,
            p_actor_username: input.actorUsername,
            p_snoozed_until: input.snoozedUntil ?? null,
          }),
        },
      );
      if (!rows[0]) throw new Error("Conversation lifecycle change returned no result.");
      return rows[0];
    },
    wakeDueSnoozed({ limit }) {
      return supabaseServerRest<AwakenedConversationRow[]>(
        "/rpc/wa_wake_due_snoozed_conversations",
        {
          method: "POST",
          body: JSON.stringify({ p_limit: limit }),
        },
      );
    },
    async changeCollaboration(input) {
      const rows = await supabaseServerRest<CollaborationResultRow[]>(
        "/rpc/wa_change_conversation_collaboration",
        {
          method: "POST",
          body: JSON.stringify({
            p_business_id: input.businessId,
            p_conversation_id: input.conversationId,
            p_operation: input.operation,
            p_idempotency_key: input.idempotencyKey,
            p_actor_kind: input.actorKind,
            p_actor_username: input.actorUsername,
            p_priority: input.priority ?? null,
            p_assignee_user_id: input.assigneeUserId ?? null,
            p_unread: input.unread ?? null,
          }),
        },
      );
      if (!rows[0]) throw new Error("Conversation collaboration change returned no result.");
      return rows[0];
    },
    async addNote(input) {
      const rows = await supabaseServerRest<AuditResultRow[]>("/rpc/wa_add_conversation_note", {
        method: "POST",
        body: JSON.stringify({
          p_business_id: input.businessId,
          p_conversation_id: input.conversationId,
          p_note: input.note,
          p_idempotency_key: input.idempotencyKey,
          p_actor_kind: input.actorKind,
          p_actor_username: input.actorUsername,
        }),
      });
      if (!rows[0]) throw new Error("Conversation note command returned no result.");
      return rows[0];
    },
    async changeTag(input) {
      const rows = await supabaseServerRest<TagResultRow[]>("/rpc/wa_change_conversation_tag", {
        method: "POST",
        body: JSON.stringify({
          p_business_id: input.businessId,
          p_conversation_id: input.conversationId,
          p_tag_id: input.tagId,
          p_operation: input.operation,
          p_idempotency_key: input.idempotencyKey,
          p_actor_kind: input.actorKind,
          p_actor_username: input.actorUsername,
        }),
      });
      if (!rows[0]) throw new Error("Conversation tag command returned no result.");
      return rows[0];
    },
  };
}

async function resolveConversation(
  dataSource: ConversationOperationsDataSource,
  input: { conversationId: string; businessId?: string },
) {
  const conversation = await dataSource.resolveConversation(input);
  if (!conversation) throw new InboxRequestError("NOT_FOUND", "Conversation was not found.", 404);
  return conversation;
}

function throwForCollaborationBlock(blockCode: string | null) {
  if (blockCode === "IDEMPOTENCY_CONFLICT") {
    throw new ConversationOperationsError(
      "IDEMPOTENCY_CONFLICT",
      "This idempotency key was already used for another conversation change.",
    );
  }
  if (blockCode === "ASSIGNEE_NOT_AVAILABLE") {
    throw new ConversationOperationsError(
      "ASSIGNEE_NOT_AVAILABLE",
      "The selected assignee is not an active user in this business.",
    );
  }
  if (blockCode === "TAG_NOT_FOUND") {
    throw new ConversationOperationsError(
      "TAG_NOT_FOUND",
      "The selected tag was not found in this business.",
      404,
    );
  }
}

function mapAuditResult(row: AuditResultRow): ConversationAuditResult {
  return {
    conversationId: row.changed_conversation_id,
    businessId: row.changed_business_id,
    applied: row.applied,
    duplicate: row.duplicate,
    eventId: row.event_id,
  };
}

function validateSnoozeWindow(snoozedUntil: string | undefined, now: Date) {
  if (!snoozedUntil) return;
  const snoozeAt = new Date(snoozedUntil).getTime();
  if (snoozeAt <= now.getTime()) {
    throw new InboxRequestError("INVALID_REQUEST", "snoozedUntil must be in the future.", 400);
  }
  if (snoozeAt > now.getTime() + 365 * 24 * 60 * 60 * 1000) {
    throw new InboxRequestError(
      "INVALID_REQUEST",
      "snoozedUntil must be within the next 365 days.",
      400,
    );
  }
}
