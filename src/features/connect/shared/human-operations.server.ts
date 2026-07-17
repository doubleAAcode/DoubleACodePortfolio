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

export type HumanSendExecutionClaim = {
  outbox_id: string;
  message_id: string | null;
  business_id: string;
  connection_id: string | null;
  recipient_phone: string;
  attempt_number: number;
};

export type HumanSendClaimRow = HumanSendExecutionClaim & {
  conversation_id: string;
  outbox_status: string;
  should_send: boolean;
  block_code: string | null;
  service_window_expires_at: string | null;
};

export type HumanSendCompleteRow = {
  outbox_id: string;
  message_id: string | null;
  outbox_status: HumanReplyStatus;
  attempt_number: number;
  next_attempt_at: string | null;
};

type HumanOutboxStateRow = {
  id: string;
  message_id: string | null;
  status: HumanReplyStatus;
  attempt_count: number;
  next_attempt_at: string | null;
};

export type HumanOperationsDataSource = {
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
  }): Promise<HumanSendClaimRow>;
  completeTextReply(input: {
    businessId: string;
    outboxId: string;
    attemptNumber: number;
    result: SendResult;
  }): Promise<HumanSendCompleteRow>;
  getTextReplyState(input: {
    businessId: string;
    outboxId: string;
  }): Promise<HumanOutboxStateRow | undefined>;
};

type HumanSendConnection = {
  phoneNumberId: string;
  config: WhatsAppServerConfig;
};

export type HumanTextSender = (input: SendWhatsAppTextInput) => Promise<SendResult>;

export type HumanSendExecutionDependencies = {
  resolveConnection?: (connectionId: string, businessId: string) => Promise<HumanSendConnection>;
  sendText?: HumanTextSender;
};

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

      const { completed, sendResult } = await executeClaimedHumanTextReply({
        claim,
        body: input.body,
        dataSource,
        resolveConnection,
        sendText,
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
      const rows = await callRpc<HumanSendClaimRow[]>("wa_claim_human_text_reply", {
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
      const rows = await callRpc<HumanSendCompleteRow[]>("wa_complete_human_text_reply", {
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
    async getTextReplyState({ businessId, outboxId }) {
      const rows = await supabaseServerRest<HumanOutboxStateRow[]>(
        `/wa_human_outbox?select=id,message_id,status,attempt_count,next_attempt_at&business_id=eq.${encodeURIComponent(businessId)}&id=eq.${encodeURIComponent(outboxId)}&limit=1`,
      );
      return rows[0];
    },
  };
}

export async function executeClaimedHumanTextReply({
  claim,
  body,
  dataSource,
  resolveConnection = resolveHumanSendConnection,
  sendText = sendHumanText,
}: {
  claim: HumanSendExecutionClaim;
  body: string;
  dataSource: HumanOperationsDataSource;
  resolveConnection?: NonNullable<HumanSendExecutionDependencies["resolveConnection"]>;
  sendText?: HumanTextSender;
}) {
  let sendResult: SendResult;
  if (!claim.connection_id) {
    sendResult = {
      ok: false,
      status: 500,
      errorCode: "CONNECTION_REQUIRED",
      errorMessage: "The conversation has no active WhatsApp connection.",
      retryable: false,
    };
  } else {
    try {
      const connection = await resolveConnection(claim.connection_id, claim.business_id);
      sendResult = await sendText({
        phoneNumberId: connection.phoneNumberId,
        recipient: claim.recipient_phone,
        message: body,
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
  }

  const completed = await completeTextReplyWithRecovery(dataSource, {
    businessId: claim.business_id,
    outboxId: claim.outbox_id,
    attemptNumber: claim.attempt_number,
    result: sendResult,
  });
  return { completed, sendResult };
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

function resultFromExistingClaim(claim: HumanSendClaimRow): HumanTextReplyResult {
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
  if (
    value === "SENT" ||
    value === "RETRYABLE" ||
    value === "FAILED" ||
    value === "RECONCILIATION_REQUIRED" ||
    value === "CANCELLED"
  ) {
    return value;
  }
  return "SENDING";
}

async function completeTextReplyWithRecovery(
  dataSource: HumanOperationsDataSource,
  input: Parameters<HumanOperationsDataSource["completeTextReply"]>[0],
) {
  let firstError: unknown;
  for (let completionAttempt = 0; completionAttempt < 2; completionAttempt += 1) {
    try {
      return await dataSource.completeTextReply(input);
    } catch (error) {
      firstError ??= error;
      try {
        const state = await dataSource.getTextReplyState({
          businessId: input.businessId,
          outboxId: input.outboxId,
        });
        if (state && state.attempt_count === input.attemptNumber && state.status !== "SENDING") {
          return {
            outbox_id: state.id,
            message_id: state.message_id,
            outbox_status: state.status,
            attempt_number: state.attempt_count,
            next_attempt_at: state.next_attempt_at,
          } satisfies HumanSendCompleteRow;
        }
      } catch {
        // A second completion attempt is safe while the same lease remains current.
      }
    }
  }
  throw firstError;
}

async function callRpc<T>(name: string, body: Record<string, unknown>) {
  return supabaseServerRest<T>(`/rpc/${name}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
