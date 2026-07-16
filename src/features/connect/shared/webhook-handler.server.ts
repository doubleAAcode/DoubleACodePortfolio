import "@tanstack/react-start/server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import {
  getMissingWhatsAppConfigKeys,
  getWhatsAppServerConfig,
} from "@/features/connect/shared/config.server";
import { resolveWhatsAppConnectionByPhoneNumber } from "@/features/connect/shared/connections.server";
import {
  processIncomingMessage,
  type BotResponse,
} from "@/features/connect/shared/conversation-engine.server";
import { hasProcessedWhatsAppMessage } from "@/features/connect/shared/duplicates.server";
import {
  createCorrelationId,
  logWhatsAppError,
  logWhatsAppInfo,
  type WhatsAppLogContext,
} from "@/features/connect/shared/logger.server";
import {
  recordWaMessageEvent,
  type WaMessageType,
} from "@/features/connect/shared/message-events.server";
import {
  applyWhatsAppMessageStatus,
  finishInboundWhatsAppMessageProcessing,
  persistInboundWhatsAppMessage,
} from "@/features/connect/shared/messaging-store.server";
import {
  parseIncomingWhatsAppMessages,
  parseWhatsAppMessageStatuses,
} from "@/features/connect/shared/parser.server";
import { maskCustomerIdentifier } from "@/features/connect/shared/reliability";
import {
  sendWhatsAppButtons,
  sendWhatsAppImage,
  sendWhatsAppList,
  sendWhatsAppText,
} from "@/features/connect/shared/sender.server";
import { recordWhatsAppWebhookLog } from "@/features/connect/shared/webhook-log-store.server";

export type WhatsAppWebhookOptions = {
  businessId?: string;
  configSuffix?: string;
  logLabel: string;
};

type WebhookTimingEntry = {
  phase: string;
  durationMs: number;
  result: "ok" | "error";
};

const WHATSAPP_IMAGE_FOLLOWUP_DELAY_MS = 2500;

export function createWhatsAppWebhookHandlers(options: WhatsAppWebhookOptions) {
  return {
    GET: ({ request }: { request: Request }) => verifyWebhook(request, options),
    POST: ({ request }: { request: Request }) => handleWebhookEvent(request, options),
  };
}

async function measureWebhookPhase<T>(
  timings: WebhookTimingEntry[],
  phase: string,
  context: WhatsAppLogContext,
  task: () => Promise<T>,
) {
  const phaseStartedAt = Date.now();
  try {
    const result = await task();
    const durationMs = Date.now() - phaseStartedAt;
    timings.push({ phase, durationMs, result: "ok" });
    logWhatsAppInfo({
      ...context,
      durationMs,
      result: "ok",
    });
    return result;
  } catch (error) {
    const durationMs = Date.now() - phaseStartedAt;
    timings.push({ phase, durationMs, result: "error" });
    logWhatsAppError(
      {
        ...context,
        durationMs,
        result: "error",
      },
      error,
    );
    throw error;
  }
}

function verifyWebhook(request: Request, options: WhatsAppWebhookOptions) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const verifyToken = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const config = getWhatsAppServerConfig(options.configSuffix);

  if (mode === "subscribe" && verifyToken === config.verifyToken && challenge) {
    void recordWhatsAppWebhookLog({
      method: request.method,
      url: request.url,
      headers: request.headers,
      status: 200,
      result: `${options.logLabel}:verification_ok`,
      businessId: options.businessId,
    });

    return new Response(challenge, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  void recordWhatsAppWebhookLog({
    method: request.method,
    url: request.url,
    headers: request.headers,
    status: 403,
    result: `${options.logLabel}:verification_forbidden`,
    businessId: options.businessId,
  });

  return new Response("Forbidden", { status: 403 });
}

async function handleWebhookEvent(request: Request, options: WhatsAppWebhookOptions) {
  console.log("[WA WEBHOOK POST HIT - TOP]", {
    method: request.method,
    url: request.url,
    hasXHubSignature256: request.headers.has("x-hub-signature-256"),
    timestamp: new Date().toISOString(),
  });

  const startedAt = Date.now();
  const timings: WebhookTimingEntry[] = [];
  const correlationId = createCorrelationId("wa_webhook");
  const rawBody = await request.text();
  console.log("[WA WEBHOOK POST RAW BODY PREVIEW]", {
    preview: redactWebhookBodyPreview(rawBody),
    length: rawBody.length,
    timestamp: new Date().toISOString(),
  });
  const config = getWhatsAppServerConfig(options.configSuffix);

  if (!isValidMetaSignature(request, rawBody, config.appSecret)) {
    void recordWhatsAppWebhookLog({
      method: request.method,
      url: request.url,
      headers: request.headers,
      status: 403,
      result: `${options.logLabel}:invalid_signature`,
    });
    return new Response("Forbidden", { status: 403 });
  }

  const payload = safeJsonParse(rawBody);
  const messages = parseIncomingWhatsAppMessages(payload);
  const statuses = parseWhatsAppMessageStatuses(payload);

  if (statuses.length) {
    await recordStatusEvents(statuses, options);
  }

  if (!messages.length) {
    logWhatsAppInfo({
      correlationId,
      operation: "webhook.parse",
      businessId: options.businessId,
      result: statuses.length ? "status_updates" : "no_supported_messages",
      durationMs: Date.now() - startedAt,
    });
    void recordWhatsAppWebhookLog({
      method: request.method,
      url: request.url,
      headers: request.headers,
      status: 200,
      messageCount: statuses.length,
      phoneNumberId: statuses[0]?.phoneNumberId,
      messageIds: statuses.map((status) => status.messageId),
      inputTypes: statuses.map((status) => `status:${status.status}`),
      result: statuses.length
        ? `${options.logLabel}:status_updates`
        : `${options.logLabel}:no_supported_messages`,
      businessId: options.businessId,
      errorSummary: summarizeStatusErrors(statuses),
    });
    return Response.json({ ok: true, processed: 0, statuses: statuses.length });
  }

  let duplicateCount = 0;
  let sendFailureCount = 0;
  const configErrors: string[] = [];
  const messageIds: string[] = [];
  const inputTypes: string[] = [];
  const senderMasks: string[] = [];
  const phoneNumberIds: string[] = [];
  const connectionIds: string[] = [];
  const businessIds: string[] = [];

  for (const message of messages) {
    const connection = await measureWebhookPhase(
      timings,
      "connection_lookup",
      {
        correlationId,
        operation: "webhook.timing.connection_lookup",
        businessId: options.businessId,
        metaMessageId: message.messageId,
        customerPhone: message.sender,
        phoneNumberId: message.phoneNumberId,
      },
      () => resolveWhatsAppConnectionByPhoneNumber(message.phoneNumberId),
    );
    messageIds.push(message.messageId);
    inputTypes.push(message.input.type);
    senderMasks.push(maskCustomerIdentifier(message.sender));
    phoneNumberIds.push(message.phoneNumberId);
    if (connection?.connectionId) connectionIds.push(connection.connectionId);
    if (connection?.businessId) businessIds.push(connection.businessId);

    if (!connection) {
      logWhatsAppInfo({
        correlationId,
        operation: "webhook.message",
        businessId: options.businessId,
        metaMessageId: message.messageId,
        customerPhone: message.sender,
        phoneNumberId: message.phoneNumberId,
        result: "unknown_phone_number",
        details: {
          timestamp: message.timestamp,
          inputType: message.input.type,
          inputLength: message.input.value.length,
        },
      });
      continue;
    }

    const persistence = await measureWebhookPhase(
      timings,
      "inbound_persistence",
      {
        correlationId,
        operation: "webhook.timing.inbound_persistence",
        businessId: connection.businessId,
        metaMessageId: message.messageId,
        customerPhone: message.sender,
        phoneNumberId: message.phoneNumberId,
      },
      () =>
        persistInboundWhatsAppMessage({
          businessId: connection.businessId,
          connectionId: connection.source === "database" ? connection.connectionId : undefined,
          message,
        }),
    );
    const isDuplicate = persistence.available
      ? !persistence.shouldProcess
      : await measureWebhookPhase(
          timings,
          "duplicate_check",
          {
            correlationId,
            operation: "webhook.timing.duplicate_check",
            businessId: connection.businessId,
            metaMessageId: message.messageId,
            customerPhone: message.sender,
            phoneNumberId: message.phoneNumberId,
          },
          () =>
            hasProcessedWhatsAppMessage({
              messageId: message.messageId,
              businessId: connection.businessId,
              customerPhone: message.sender,
            }),
        );

    logWhatsAppInfo({
      correlationId,
      operation: "webhook.message",
      businessId: connection.businessId,
      metaMessageId: message.messageId,
      customerPhone: message.sender,
      phoneNumberId: message.phoneNumberId,
      result: isDuplicate ? "duplicate" : "accepted",
      details: {
        connectionId: connection.connectionId,
        connectionSource: connection.source,
        durableMessageInserted: persistence.inserted,
        durableMessageId: persistence.messageId,
        timestamp: message.timestamp,
        inputType: message.input.type,
        inputLength: message.input.value.length,
      },
    });

    if (isDuplicate) {
      duplicateCount += 1;
      continue;
    }

    try {
      await measureWebhookPhase(
        timings,
        "inbound_event_log",
        {
          correlationId,
          operation: "webhook.timing.inbound_event_log",
          businessId: connection.businessId,
          metaMessageId: message.messageId,
          customerPhone: message.sender,
          phoneNumberId: message.phoneNumberId,
        },
        () =>
          recordWaMessageEvent({
            businessId: connection.businessId,
            connectionId: connection.connectionId,
            phoneNumberId: message.phoneNumberId,
            customerPhone: message.sender,
            direction: "INBOUND",
            senderType: "CUSTOMER",
            messageType: toMessageEventType(message.input.type),
            body: message.input.type === "text" ? message.input.value : undefined,
            summary: readableIncomingSummary(message.input.type, message.input.value),
            metaMessageId: message.messageId,
            status: "received",
            rawPayload: {
              messageId: message.messageId,
              timestamp: message.timestamp,
              inputType: message.input.type,
              inputValue: message.input.value,
            },
          }),
      );
    } catch (error) {
      await recordInboundProcessingFailure(connection.businessId, message.messageId, error);
      throw error;
    }

    const missingKeys = getMissingWhatsAppConfigKeys(connection.config);
    if (missingKeys.length) {
      configErrors.push(...missingKeys);
      await finishInboundWhatsAppMessageProcessing({
        businessId: connection.businessId,
        metaMessageId: message.messageId,
        succeeded: false,
        error: `Missing WhatsApp configuration: ${missingKeys.join(", ")}`,
      });
      logWhatsAppError({
        correlationId,
        operation: "webhook.config",
        businessId: connection.businessId,
        metaMessageId: message.messageId,
        customerPhone: message.sender,
        phoneNumberId: message.phoneNumberId,
        result: "missing_config",
        details: { keys: missingKeys },
      });
      continue;
    }

    let responses: BotResponse[];
    try {
      responses = await measureWebhookPhase(
        timings,
        "process_incoming_message",
        {
          correlationId,
          operation: "webhook.timing.process_incoming_message",
          businessId: connection.businessId,
          metaMessageId: message.messageId,
          customerPhone: message.sender,
          phoneNumberId: message.phoneNumberId,
        },
        () =>
          processIncomingMessage({
            businessId: connection.businessId,
            customerPhone: message.sender,
            messageId: message.messageId,
            input: message.input,
          }),
      );
    } catch (error) {
      await recordInboundProcessingFailure(connection.businessId, message.messageId, error);
      throw error;
    }

    await measureWebhookPhase(
      timings,
      "inbound_processing_complete",
      {
        correlationId,
        operation: "webhook.timing.inbound_processing_complete",
        businessId: connection.businessId,
        metaMessageId: message.messageId,
        customerPhone: message.sender,
        phoneNumberId: message.phoneNumberId,
      },
      () =>
        finishInboundWhatsAppMessageProcessing({
          businessId: connection.businessId,
          metaMessageId: message.messageId,
          succeeded: true,
        }),
    );

    for (let responseIndex = 0; responseIndex < responses.length; responseIndex += 1) {
      const response = responses[responseIndex];
      const nextResponse = responses[responseIndex + 1];
      const result = await measureWebhookPhase(
        timings,
        "send_whatsapp_response",
        {
          correlationId,
          operation: "webhook.timing.send_whatsapp_response",
          businessId: connection.businessId,
          metaMessageId: message.messageId,
          customerPhone: message.sender,
          phoneNumberId: message.phoneNumberId,
          details: { responseType: response.type },
        },
        () =>
          response.type === "buttons"
            ? sendWhatsAppButtons({
                phoneNumberId: message.phoneNumberId,
                recipient: message.sender,
                body: response.body,
                buttons: response.buttons,
                config: connection.config,
                logContext: {
                  businessId: connection.businessId,
                  connectionId: connection.connectionId,
                  senderType: "BOT",
                },
              })
            : response.type === "list"
              ? sendWhatsAppList({
                  phoneNumberId: message.phoneNumberId,
                  recipient: message.sender,
                  body: response.body,
                  buttonText: response.buttonText,
                  sections: response.sections,
                  config: connection.config,
                  logContext: {
                    businessId: connection.businessId,
                    connectionId: connection.connectionId,
                    senderType: "BOT",
                  },
                })
              : response.type === "image"
                ? sendWhatsAppImage({
                    phoneNumberId: message.phoneNumberId,
                    recipient: message.sender,
                    imageUrl: response.imageUrl,
                    caption: response.caption,
                    config: connection.config,
                    logContext: {
                      businessId: connection.businessId,
                      connectionId: connection.connectionId,
                      senderType: "BOT",
                    },
                  })
                : sendWhatsAppText({
                    phoneNumberId: message.phoneNumberId,
                    recipient: message.sender,
                    message: response.text,
                    config: connection.config,
                    logContext: {
                      businessId: connection.businessId,
                      connectionId: connection.connectionId,
                      senderType: "BOT",
                    },
                  }),
      );

      if (!result.ok) {
        sendFailureCount += 1;
        logWhatsAppError({
          correlationId,
          operation: "webhook.send_response",
          businessId: connection.businessId,
          metaMessageId: message.messageId,
          customerPhone: message.sender,
          phoneNumberId: message.phoneNumberId,
          result: "send_failed",
          errorCode: result.errorCode,
          details: {
            status: result.status,
            retryable: result.retryable,
            errorMessage: result.errorMessage,
          },
        });
      }

      if (result.ok && shouldPauseAfterWhatsAppResponse(response, nextResponse)) {
        await measureWebhookPhase(
          timings,
          "media_ordering_pause",
          {
            correlationId,
            operation: "webhook.timing.media_ordering_pause",
            businessId: connection.businessId,
            metaMessageId: message.messageId,
            customerPhone: message.sender,
            phoneNumberId: message.phoneNumberId,
            details: {
              responseType: response.type,
              nextResponseType: nextResponse?.type,
              delayMs: WHATSAPP_IMAGE_FOLLOWUP_DELAY_MS,
            },
          },
          () => sleep(WHATSAPP_IMAGE_FOLLOWUP_DELAY_MS),
        );
      }
    }
  }

  logWhatsAppInfo({
    correlationId,
    operation: "webhook.timing.total",
    businessId: businessIds[0] ?? options.businessId,
    phoneNumberId: phoneNumberIds[0],
    durationMs: Date.now() - startedAt,
    result: sendFailureCount ? "processed_with_send_failures" : "processed",
    details: {
      messageCount: messages.length,
      duplicateCount,
      timings,
    },
  });

  void recordWhatsAppWebhookLog({
    method: request.method,
    url: request.url,
    headers: request.headers,
    status: 200,
    messageCount: messages.length,
    duplicateCount,
    messageIds,
    senderMask: senderMasks[0],
    phoneNumberId: phoneNumberIds[0],
    connectionId: connectionIds[0],
    businessId: businessIds[0] ?? options.businessId,
    inputTypes,
    result: sendFailureCount
      ? `${options.logLabel}:processed_with_send_failures`
      : `${options.logLabel}:processed`,
    errorSummary: configErrors.length
      ? `Missing env: ${[...new Set(configErrors)].join(", ")}`
      : sendFailureCount
        ? `${sendFailureCount} send failure(s)`
        : undefined,
  });

  return Response.json({ ok: true, processed: messages.length });
}

function shouldPauseAfterWhatsAppResponse(
  response: BotResponse,
  nextResponse: BotResponse | undefined,
) {
  return response.type === "image" && Boolean(nextResponse);
}

function sleep(durationMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

async function recordStatusEvents(
  statuses: ReturnType<typeof parseWhatsAppMessageStatuses>,
  options: WhatsAppWebhookOptions,
) {
  for (const item of statuses) {
    const connection = await resolveWhatsAppConnectionByPhoneNumber(item.phoneNumberId);
    if (connection) {
      await applyWhatsAppMessageStatus({ businessId: connection.businessId, status: item });
    }
    await recordWaMessageEvent({
      businessId: connection?.businessId ?? options.businessId,
      connectionId: connection?.connectionId,
      phoneNumberId: item.phoneNumberId,
      customerPhone: item.recipient,
      direction: "OUTBOUND",
      senderType: "SYSTEM",
      messageType: "unknown",
      summary: readableStatusSummary(item),
      metaMessageId: item.messageId,
      status: item.status,
      errorCode: item.errorCode,
      errorMessage: item.errorMessage,
      rawPayload: {
        messageId: item.messageId,
        timestamp: item.timestamp,
        recipient: item.recipient,
        status: item.status,
        errorCode: item.errorCode,
        errorMessage: item.errorMessage,
      },
    });
  }
}

async function recordInboundProcessingFailure(
  businessId: string,
  metaMessageId: string,
  error: unknown,
) {
  try {
    await finishInboundWhatsAppMessageProcessing({
      businessId,
      metaMessageId,
      succeeded: false,
      error,
    });
  } catch (persistenceError) {
    logWhatsAppError(
      {
        operation: "webhook.inbound_processing_failure_persistence",
        businessId,
        metaMessageId,
        result: "error",
      },
      persistenceError,
    );
  }
}

function toMessageEventType(inputType: string): WaMessageType {
  if (inputType === "text" || inputType === "button" || inputType === "list") return inputType;
  return "unknown";
}

function readableIncomingSummary(inputType: string, value: string) {
  if (inputType === "text") return `Customer said: ${value || "(empty text)"}`;
  if (inputType === "button") return `Customer tapped button: ${value || "(empty button)"}`;
  if (inputType === "list") return `Customer selected list item: ${value || "(empty list item)"}`;
  if (inputType === "location") return `Customer shared location: ${value || "(location)"}`;
  return `Customer sent ${inputType || "unknown"} message: ${value || "(no readable text)"}`;
}

function readableStatusSummary(status: ReturnType<typeof parseWhatsAppMessageStatuses>[number]) {
  if (status.status === "failed") {
    return `Meta delivery failed for ${status.recipient || "recipient"}: ${
      status.errorMessage || status.errorCode || "unknown error"
    }`;
  }
  return `Meta marked message ${status.status} for ${status.recipient || "recipient"}.`;
}

function summarizeStatusErrors(statuses: ReturnType<typeof parseWhatsAppMessageStatuses>) {
  const failed = statuses.filter((status) => status.status === "failed");
  if (!failed.length) return undefined;
  return failed
    .map((status) => status.errorMessage || status.errorCode || "Unknown delivery failure")
    .join("; ");
}

function safeJsonParse(rawBody: string) {
  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}

function redactWebhookBodyPreview(rawBody: string) {
  return rawBody
    .slice(0, 500)
    .replace(
      /("?(?:token|secret|authorization|access_token|app_secret)"?\s*:\s*)"[^"]*"/gi,
      '$1"[redacted]"',
    );
}

function isValidMetaSignature(request: Request, rawBody: string, appSecret: string) {
  if (!appSecret) return true;

  const signature = request.headers.get("x-hub-signature-256");
  if (!signature?.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const received = signature.slice("sha256=".length);
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}
