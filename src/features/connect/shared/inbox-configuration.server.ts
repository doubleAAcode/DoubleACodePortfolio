import "@tanstack/react-start/server-only";

import { supabaseServerRest } from "../../../lib/supabase/server-rest.server.ts";
import {
  InboxConfigurationError,
  normalizeCannedReplySaveCommand,
  type CannedReplySaveCommand,
  type CannedReplySaveResult,
  type InboxCannedReply,
  type InboxConfigurationService,
} from "./inbox-configuration.ts";
import { InboxRequestError, parseInboxBusinessId } from "./inbox-query.ts";

type BusinessRow = { id: string };
type AssigneeRow = { id: string; email: string; display_name: string | null; role: string };
type TagRow = { id: string; name: string; color: string };
type CannedReplyRow = {
  id: string;
  business_id: string;
  title: string;
  body: string;
  shortcut: string | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
type CannedReplyResultRow = {
  changed_reply_id: string | null;
  changed_business_id: string;
  current_title: string | null;
  current_body: string | null;
  current_shortcut: string | null;
  current_category: string | null;
  current_is_active: boolean | null;
  current_created_at: string | null;
  current_updated_at: string | null;
  applied: boolean;
  duplicate: boolean;
  block_code: string | null;
  audit_event_id: string | null;
};

export type InboxConfigurationDataSource = {
  businessExists(businessId: string): Promise<boolean>;
  listAssignees(businessId: string): Promise<AssigneeRow[]>;
  listTags(businessId: string): Promise<TagRow[]>;
  listCannedReplies(businessId: string, includeInactive: boolean): Promise<CannedReplyRow[]>;
  saveCannedReply(
    input: ReturnType<typeof normalizeCannedReplySaveCommand>,
  ): Promise<CannedReplyResultRow>;
};

export function createInboxConfigurationService(
  dataSource = createInboxConfigurationDataSource(),
): InboxConfigurationService {
  const requireBusiness = async (businessId: string) => {
    const parsed = parseInboxBusinessId(businessId);
    if (!(await dataSource.businessExists(parsed))) {
      throw new InboxRequestError("NOT_FOUND", "Business was not found.", 404);
    }
    return parsed;
  };

  return {
    async getOptions(businessId) {
      const scopedBusinessId = await requireBusiness(businessId);
      const [assignees, tags, cannedReplies] = await Promise.all([
        dataSource.listAssignees(scopedBusinessId),
        dataSource.listTags(scopedBusinessId),
        dataSource.listCannedReplies(scopedBusinessId, false),
      ]);
      return {
        businessId: scopedBusinessId,
        assignees: assignees.map((row) => ({
          id: row.id,
          email: row.email,
          displayName: row.display_name,
          role: row.role,
        })),
        tags,
        cannedReplies: cannedReplies.map(mapCannedReply),
      };
    },
    async listCannedReplies(businessId, includeInactive = false) {
      const scopedBusinessId = await requireBusiness(businessId);
      return (await dataSource.listCannedReplies(scopedBusinessId, includeInactive)).map(
        mapCannedReply,
      );
    },
    async saveCannedReply(command) {
      const input = normalizeCannedReplySaveCommand(command);
      await requireBusiness(input.businessId);
      const row = await dataSource.saveCannedReply(input);
      throwForBlock(row.block_code);
      if (
        !row.changed_reply_id ||
        !row.current_title ||
        !row.current_body ||
        row.current_is_active == null ||
        !row.current_created_at ||
        !row.current_updated_at
      ) {
        throw new Error("Canned reply command returned incomplete state.");
      }
      return {
        reply: mapCannedReply({
          id: row.changed_reply_id,
          business_id: row.changed_business_id,
          title: row.current_title,
          body: row.current_body,
          shortcut: row.current_shortcut,
          category: row.current_category,
          is_active: row.current_is_active,
          created_at: row.current_created_at,
          updated_at: row.current_updated_at,
        }),
        applied: row.applied,
        duplicate: row.duplicate,
        auditEventId: row.audit_event_id,
      } satisfies CannedReplySaveResult;
    },
  };
}

export function createInboxConfigurationDataSource(): InboxConfigurationDataSource {
  return {
    async businessExists(businessId) {
      const rows = await supabaseServerRest<BusinessRow[]>(
        `/wa_businesses?select=id&id=eq.${encodeURIComponent(businessId)}&limit=1`,
      );
      return Boolean(rows[0]);
    },
    listAssignees(businessId) {
      return supabaseServerRest<AssigneeRow[]>(
        `/wa_business_users?select=id,email,display_name,role&business_id=eq.${encodeURIComponent(businessId)}&status=eq.ACTIVE&order=display_name.asc.nullslast,email.asc`,
      );
    },
    listTags(businessId) {
      return supabaseServerRest<TagRow[]>(
        `/wa_tags?select=id,name,color&business_id=eq.${encodeURIComponent(businessId)}&order=name.asc`,
      );
    },
    listCannedReplies(businessId, includeInactive) {
      const active = includeInactive ? "" : "&is_active=eq.true";
      return supabaseServerRest<CannedReplyRow[]>(
        `/wa_canned_replies?select=id,business_id,title,body,shortcut,category,is_active,created_at,updated_at&business_id=eq.${encodeURIComponent(businessId)}${active}&order=category.asc.nullslast,title.asc`,
      );
    },
    async saveCannedReply(input) {
      const rows = await supabaseServerRest<CannedReplyResultRow[]>("/rpc/wa_save_canned_reply", {
        method: "POST",
        body: JSON.stringify({
          p_business_id: input.businessId,
          p_operation: input.operation,
          p_idempotency_key: input.idempotencyKey,
          p_actor_kind: input.actorKind,
          p_actor_username: input.actorUsername,
          p_reply_id: input.replyId ?? null,
          p_title: input.title ?? null,
          p_body: input.body ?? null,
          p_shortcut: input.shortcut ?? null,
          p_category: input.category ?? null,
        }),
      });
      if (!rows[0]) throw new Error("Canned reply command returned no result.");
      return rows[0];
    },
  };
}

function mapCannedReply(row: CannedReplyRow): InboxCannedReply {
  return {
    id: row.id,
    businessId: row.business_id,
    title: row.title,
    body: row.body,
    shortcut: row.shortcut,
    category: row.category,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function throwForBlock(blockCode: string | null) {
  if (blockCode === "IDEMPOTENCY_CONFLICT") {
    throw new InboxConfigurationError(
      "IDEMPOTENCY_CONFLICT",
      "This idempotency key was already used for another canned reply change.",
      409,
    );
  }
  if (blockCode === "SHORTCUT_CONFLICT") {
    throw new InboxConfigurationError(
      "SHORTCUT_CONFLICT",
      "That shortcut is already used by another active canned reply.",
      409,
    );
  }
  if (blockCode === "CANNED_REPLY_NOT_FOUND") {
    throw new InboxConfigurationError("CANNED_REPLY_NOT_FOUND", "Canned reply was not found.", 404);
  }
}
