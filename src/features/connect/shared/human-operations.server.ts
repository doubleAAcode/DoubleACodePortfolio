import "@tanstack/react-start/server-only";

import { supabaseServerRest } from "../../../lib/supabase/server-rest.server.ts";

import { getWhatsAppServerConfig, type WhatsAppServerConfig } from "./config.server.ts";
import {
  HumanOperationsError,
  normalizeHumanTextReplyCommand,
  type HumanOperationsService,
  type HumanReplyStatus,
  type HumanTextReplyCommand,
  type HumanTextReplyResult,
} from "./human-operations.ts";
import type { SendResult, SendWhatsAppTextInput } from "./sender.server.ts";

type ConversationScopeRow = {
  business_id: string;
  status: "OPEN" | "PENDING" | "SNOOZED" | "CLOSED";
};

type HumanConnectionRow = {
  id: string;
  business_id: string;
  phone_number_id: string;
  config_suffix: string | null;
  is_active: boolean;
  status: string;
};

type ClaimRow = {
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

type CompleteRow = {
  outbox_id: string;
  message_id: string | null;
  outbox_status: HumanReplyStatus;
  attempt_number: number;
  next_attempt_at: string | null;
};

type HumanOperationsDataSource = {
  resolveConversation(input: {
    conversationId: string;
    businessId?: string;
  }): Promise<ConversationScopeRow | undefined>;
  claimTextReply(input: {
    businessId: string;
    conversationId: string;
    idempotencyKey: string;
    body: string;
    actorKind: string;
    actorUsername: string;
  }): Promise<ClaimRow>;
  completeTextReply(input: {
    businessId: string;
    outboxId: string;
    attemptNumber: number;
    result: SendResult;
  }): Promise<CompleteRow>;
};

type HumanSendConnection = {
  phoneNumberId: string;
  config: WhatsAppServerConfig;
};

type HumanTextSender = (input: SendWhatsAppTextInput) => Promise<SendResult>;

export type HumanOperationsDependencies = {
  dataSource?: HumanOperationsDataSource;
  isSendEnabled?: () => boolean;
  resolveConnection?: (connectionId: string, businessId: string) => Promise<HumanSendConnection>;
  sendText?: HumanTextSender;
};

export function createHumanOperationsService(
  dependencies: HumanOperationsDependencies = {},
): HumanOperationsService {
  const dataSource = dependencies.dataSource ?? createHumanOperationsDataSource();
  const isSendEnabled = dependencies.isSendEnabled ?? isHumanSendEnabled;
  const resolveConnection = dependencies.resolveConnection ?? resolveHumanSendConnection;
  const sendText = dependencies.sendText ?? sendHumanText;

  return {
    async sendTextReply(command: HumanTextReplyCommand): Promise<HumanTextReplyResult> {
      const input = normalizeHumanTextReplyCommand(command);
      if (!isSendEnabled()) {
        throw new HumanOperationsError(
          "HUMAN_SEND_DISABLED",
          "Human WhatsApp sending is disabled for this release.",
          503,
        );
      }

      const conversation = await dataSource.resolveConversation({
        conversationId: input.conversationId,
        businessId: input.businessId,
      });
      if (!conversation) {
        throw new HumanOperationsError("NOT_FOUND", "Conversation was not found.", 404);
      }
      if (conversation.status === "CLOSED") {
        throw new HumanOperationsError(
          "CONVERSATION_CLOSED",
          "Reopen the conversation before replying.",
          409,
        );
      }

      const claim = await dataSource.claimTextReply({
        businessId: conversation.business_id,
        conversationId: input.conversationId,
        idempotencyKey: input.idempotencyKey,
        body: input.body,
        actorKind: input.actorKind,
        actorUsername: input.actorUsername,
      });
      if (claim.block_code === "IDEMPOTENCY_CONFLICT") {
        throw new HumanOperationsError(
          "IDEMPOTENCY_CONFLICT",
          "This idempotency key was already used for a different reply.",
          409,
        );
      }
      if (claim.block_code === "TEMPLATE_REQUIRED" || claim.outbox_status === "BLOCKED") {
        throw new HumanOperationsError(
          "TEMPLATE_REQUIRED",
          "The WhatsApp customer-service window is closed. Use an approved template.",
          409,
        );
      }
      if (!claim.service_window_expires_at) {
        throw new HumanOperationsError(
          "INTERNAL_ERROR",
          "The service-window result was incomplete.",
          502,
        );
      }
      if (!claim.should_send) return resultFromExistingClaim(claim);
      if (!claim.connection_id) {
        return completeFailedClaim({
          dataSource,
          claim,
          errorCode: "CONNECTION_REQUIRED",
          errorMessage: "The conversation has no active WhatsApp connection.",
          retryable: false,
        });
      }

      let sendResult: SendResult;
      try {
        const connection = await resolveConnection(claim.connection_id, claim.business_id);
        sendResult = await sendText({
          phoneNumberId: connection.phoneNumberId,
          recipient: claim.recipient_phone,
          message: input.body,
          config: connection.config,
          logContext: {
            businessId: claim.business_id,
            connectionId: claim.connection_id,
            senderType: "HUMAN",
          },
        });
      } catch {
        sendResult = {
          ok: false,
          status: 0,
          errorCode: "CONNECTION_UNAVAILABLE",
          errorMessage: "The WhatsApp connection could not be prepared for sending.",
          retryable: true,
        };
      }

      const completed = await dataSource.completeTextReply({
        businessId: claim.business_id,
        outboxId: claim.outbox_id,
        attemptNumber: claim.attempt_number,
        result: sendResult,
      });
      return {
        outboxId: completed.outbox_id,
        messageId: completed.message_id,
        status: completed.outbox_status,
        attemptNumber: completed.attempt_number,
        duplicate: false,
        retryable: completed.outbox_status === "RETRYABLE",
        serviceWindowExpiresAt: claim.service_window_expires_at,
        ...(!sendResult.ok && sendResult.errorCode ? { errorCode: sendResult.errorCode } : {}),
      };
    },
  };
}

export function isHumanSendEnabled() {
  return process.env.CONNECT_HUMAN_SEND_ENABLED?.trim().toLowerCase() === "true";
}

export function createHumanOperationsDataSource(): HumanOperationsDataSource {
  return {
    async resolveConversation({ conversationId, businessId }) {
      const scope = businessId ? `&business_id=eq.${encodeURIComponent(businessId)}` : "";
      const rows = await supabaseServerRest<ConversationScopeRow[]>(
        `/wa_conversations?select=business_id,status&id=eq.${encodeURIComponent(conversationId)}${scope}&limit=1`,
      );
      return rows[0];
    },
    async claimTextReply(input) {
      const rows = await callRpc<ClaimRow[]>("wa_claim_human_text_reply", {
        p_business_id: input.businessId,
        p_conversation_id: input.conversationId,
        p_idempotency_key: input.idempotencyKey,
        p_body: input.body,
        p_requested_by_kind: input.actorKind,
        p_requested_by_username: input.actorUsername,
      });
      if (!rows[0]) throw new Error("Human reply claim returned no result.");
      return rows[0];
    },
    async completeTextReply(input) {
      const result = input.result;
      const rows = await callRpc<CompleteRow[]>("wa_complete_human_text_reply", {
        p_business_id: input.businessId,
        p_outbox_id: input.outboxId,
        p_attempt_number: input.attemptNumber,
        p_succeeded: result.ok,
        p_http_status: result.ok ? 200 : result.status,
        p_meta_message_id: result.ok ? (result.messageId ?? null) : null,
        p_error_code: result.ok ? null : (result.errorCode ?? null),
        p_error_message: result.ok ? null : result.errorMessage,
        p_retryable: result.ok ? false : Boolean(result.retryable),
      });
      if (!rows[0]) throw new Error("Human reply completion returned no result.");
      return rows[0];
    },
  };
}

async function resolveHumanSendConnection(
  connectionId: string,
  businessId: string,
): Promise<HumanSendConnection> {
  const rows = await supabaseServerRest<HumanConnectionRow[]>(
    `/wa_whatsapp_connections?select=id,business_id,phone_number_id,config_suffix,is_active,status&id=eq.${encodeURIComponent(connectionId)}&business_id=eq.${encodeURIComponent(businessId)}&limit=1`,
  );
  const connection = rows[0];
  if (!connection || !connection.is_active || connection.status !== "ACTIVE") {
    throw new Error("The WhatsApp connection is not active for this business.");
  }
  return {
    phoneNumberId: connection.phone_number_id,
    config: getWhatsAppServerConfig(connection.config_suffix ?? ""),
  };
}

async function sendHumanText(input: SendWhatsAppTextInput) {
  const { sendWhatsAppText } = await import("./sender.server.ts");
  return sendWhatsAppText(input);
}

async function completeFailedClaim({
  dataSource,
  claim,
  errorCode,
  errorMessage,
  retryable,
}: {
  dataSource: HumanOperationsDataSource;
  claim: ClaimRow;
  errorCode: string;
  errorMessage: string;
  retryable: boolean;
}) {
  const completed = await dataSource.completeTextReply({
    businessId: claim.business_id,
    outboxId: claim.outbox_id,
    attemptNumber: claim.attempt_number,
    result: {
      ok: false,
      status: 500,
      errorCode,
      errorMessage,
      retryable,
    },
  });
  return {
    outboxId: completed.outbox_id,
    messageId: completed.message_id,
    status: completed.outbox_status,
    attemptNumber: completed.attempt_number,
    duplicate: false,
    retryable: completed.outbox_status === "RETRYABLE",
    serviceWindowExpiresAt: claim.service_window_expires_at!,
    errorCode,
  } satisfies HumanTextReplyResult;
}

function resultFromExistingClaim(claim: ClaimRow): HumanTextReplyResult {
  const status = normalizeExistingStatus(claim.outbox_status);
  return {
    outboxId: claim.outbox_id,
    messageId: claim.message_id,
    status,
    attemptNumber: claim.attempt_number,
    duplicate: true,
    retryable: status === "RETRYABLE",
    serviceWindowExpiresAt: claim.service_window_expires_at!,
  };
}

function normalizeExistingStatus(value: string): HumanReplyStatus {
  if (value === "SENT" || value === "RETRYABLE" || value === "FAILED" || value === "CANCELLED") {
    return value;
  }
  return "SENDING";
}

async function callRpc<T>(name: string, body: Record<string, unknown>) {
  return supabaseServerRest<T>(`/rpc/${name}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
