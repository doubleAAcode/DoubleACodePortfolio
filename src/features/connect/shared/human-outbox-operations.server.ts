import "@tanstack/react-start/server-only";

import { supabaseServerRest } from "../../../lib/supabase/server-rest.server.ts";

import {
  type HumanOutboxProcessor,
  type HumanReconciliationItem,
  type HumanReconciliationResult,
  type HumanReconciliationService,
  type HumanRetryProcessorSummary,
  parseHumanOperationLimit,
} from "./human-outbox-operations.ts";
import {
  createHumanOperationsDataSource,
  executeClaimedHumanTextReply,
  isHumanSendEnabled,
  type HumanOperationsDataSource,
  type HumanSendExecutionClaim,
  type HumanSendExecutionDependencies,
} from "./human-operations.server.ts";

type QuarantinedRow = {
  quarantined_outbox_id: string;
  quarantined_business_id: string;
  quarantined_message_id: string | null;
  quarantined_attempt_number: number;
};

type RetryClaimRow = HumanSendExecutionClaim & {
  conversation_id: string;
  body: string;
  should_send: boolean;
  block_code: string | null;
};

type ReconciliationRow = {
  id: string;
  message_id: string | null;
  business_id: string;
  conversation_id: string;
  body: string;
  attempt_count: number;
  error_code: string | null;
  error_message: string | null;
  service_window_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

type ResolutionRow = {
  resolved_outbox_id: string;
  resolved_message_id: string | null;
  resolved_status: string;
  resolved_attempt_number: number;
  resolved_next_attempt_at: string | null;
};

export type HumanOutboxOperationsDataSource = {
  quarantineExpired(input: { limit: number }): Promise<QuarantinedRow[]>;
  claimDueRetries(input: { limit: number; leaseSeconds: number }): Promise<RetryClaimRow[]>;
  listReconciliationRequired(input: { limit: number }): Promise<ReconciliationRow[]>;
  resolveReconciliation(input: {
    businessId: string;
    outboxId: string;
    resolution: string;
    resolvedByUsername: string;
    metaMessageId?: string;
    note?: string;
  }): Promise<ResolutionRow>;
};

export type HumanOutboxProcessorDependencies = HumanSendExecutionDependencies & {
  operationsDataSource?: HumanOutboxOperationsDataSource;
  completionDataSource?: HumanOperationsDataSource;
  isSendEnabled?: () => boolean;
};

export function createHumanOutboxProcessor(
  dependencies: HumanOutboxProcessorDependencies = {},
): HumanOutboxProcessor {
  const operationsDataSource =
    dependencies.operationsDataSource ?? createHumanOutboxOperationsDataSource();
  const completionDataSource =
    dependencies.completionDataSource ?? createHumanOperationsDataSource();
  const sendEnabled = dependencies.isSendEnabled ?? isHumanSendEnabled;

  return {
    async processDueReplies(input = {}) {
      const limit = parseHumanOperationLimit(input.limit, 10);
      const quarantined = await operationsDataSource.quarantineExpired({ limit });
      const summary = emptySummary(sendEnabled(), quarantined.length);
      if (!summary.sendEnabled) return summary;

      const candidates = await operationsDataSource.claimDueRetries({
        limit,
        leaseSeconds: 120,
      });
      summary.candidates = candidates.length;

      for (const claim of candidates) {
        if (!claim.should_send) {
          if (claim.block_code === "TEMPLATE_REQUIRED") summary.blocked += 1;
          else if (claim.block_code === "MAX_ATTEMPTS_REACHED") summary.exhausted += 1;
          continue;
        }

        summary.claimed += 1;
        try {
          const { completed } = await executeClaimedHumanTextReply({
            claim,
            body: claim.body,
            dataSource: completionDataSource,
            resolveConnection: dependencies.resolveConnection,
            sendText: dependencies.sendText,
          });
          if (completed.outbox_status === "SENT") summary.sent += 1;
          else if (completed.outbox_status === "RETRYABLE") summary.retryable += 1;
          else if (completed.outbox_status === "RECONCILIATION_REQUIRED") {
            summary.reconciliationRequired += 1;
          } else summary.failed += 1;
        } catch {
          summary.completionUncertain += 1;
          console.error("[connect:human-outbox] retry completion is uncertain", {
            outboxId: claim.outbox_id,
          });
        }
      }
      return summary;
    },
  };
}

export function createHumanReconciliationService(
  dataSource = createHumanOutboxOperationsDataSource(),
): HumanReconciliationService {
  return {
    async listRequired(input = {}) {
      const rows = await dataSource.listReconciliationRequired({
        limit: parseHumanOperationLimit(input.limit, 20),
      });
      return rows.map(mapReconciliationItem);
    },
    async resolve(input) {
      const row = await dataSource.resolveReconciliation(input);
      return {
        outboxId: row.resolved_outbox_id,
        messageId: row.resolved_message_id,
        status: row.resolved_status,
        attemptNumber: row.resolved_attempt_number,
        nextAttemptAt: row.resolved_next_attempt_at,
      } satisfies HumanReconciliationResult;
    },
  };
}

export function createHumanOutboxOperationsDataSource(): HumanOutboxOperationsDataSource {
  return {
    quarantineExpired({ limit }) {
      return callRpc<QuarantinedRow[]>("wa_quarantine_expired_human_sends", {
        p_limit: limit,
      });
    },
    claimDueRetries({ limit, leaseSeconds }) {
      return callRpc<RetryClaimRow[]>("wa_claim_due_human_text_replies", {
        p_limit: limit,
        p_lease_seconds: leaseSeconds,
      });
    },
    async listReconciliationRequired({ limit }) {
      return supabaseServerRest<ReconciliationRow[]>(
        `/wa_human_outbox?select=id,message_id,business_id,conversation_id,body,attempt_count,error_code,error_message,service_window_expires_at,created_at,updated_at&status=eq.RECONCILIATION_REQUIRED&order=updated_at.asc,id.asc&limit=${limit}`,
      );
    },
    async resolveReconciliation(input) {
      const rows = await callRpc<ResolutionRow[]>("wa_resolve_human_send_reconciliation", {
        p_business_id: input.businessId,
        p_outbox_id: input.outboxId,
        p_resolution: input.resolution,
        p_resolved_by_username: input.resolvedByUsername,
        p_meta_message_id: input.metaMessageId ?? null,
        p_note: input.note ?? null,
      });
      if (!rows[0]) throw new Error("Human reconciliation returned no result.");
      return rows[0];
    },
  };
}

function emptySummary(sendEnabled: boolean, quarantined: number): HumanRetryProcessorSummary {
  return {
    sendEnabled,
    quarantined,
    candidates: 0,
    claimed: 0,
    sent: 0,
    retryable: 0,
    failed: 0,
    blocked: 0,
    exhausted: 0,
    reconciliationRequired: quarantined,
    completionUncertain: 0,
  };
}

function mapReconciliationItem(row: ReconciliationRow): HumanReconciliationItem {
  return {
    outboxId: row.id,
    messageId: row.message_id,
    businessId: row.business_id,
    conversationId: row.conversation_id,
    body: row.body,
    attemptNumber: row.attempt_count,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    serviceWindowExpiresAt: row.service_window_expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function callRpc<T>(name: string, body: Record<string, unknown>) {
  return supabaseServerRest<T>(`/rpc/${name}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
