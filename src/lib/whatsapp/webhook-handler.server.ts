import "@tanstack/react-start/server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import {
  getMissingWhatsAppConfigKeys,
  getWhatsAppServerConfig,
} from "@/lib/whatsapp/config.server";
import { resolveWhatsAppConnectionByPhoneNumber } from "@/lib/whatsapp/connections.server";
import { processIncomingMessage } from "@/lib/whatsapp/conversation-engine.server";
import { hasProcessedWhatsAppMessage } from "@/lib/whatsapp/duplicates.server";
import {
  createCorrelationId,
  logWhatsAppError,
  logWhatsAppInfo,
} from "@/lib/whatsapp/logger.server";
import { recordWaMessageEvent, type WaMessageType } from "@/lib/whatsapp/message-events.server";
import {
  parseIncomingWhatsAppMessages,
  parseWhatsAppMessageStatuses,
} from "@/lib/whatsapp/parser.server";
import { maskCustomerIdentifier } from "@/lib/whatsapp/reliability";
import {
  sendWhatsAppButtons,
  sendWhatsAppList,
  sendWhatsAppText,
} from "@/lib/whatsapp/sender.server";
import { recordWhatsAppWebhookLog } from "@/lib/whatsapp/webhook-log-store.server";

export type WhatsAppWebhookOptions = {
  businessId?: string;
  configSuffix?: string;
  logLabel: string;
};

export function createWhatsAppWebhookHandlers(options: WhatsAppWebhookOptions) {
  return {
    GET: ({ request }: { request: Request }) => verifyWebhook(request, options),
    POST: ({ request }: { request: Request }) => handleWebhookEvent(request, options),
  };
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
    const connection = await resolveWhatsAppConnectionByPhoneNumber(message.phoneNumberId);
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

    const isDuplicate = await hasProcessedWhatsAppMessage({
      messageId: message.messageId,
      businessId: connection.businessId,
      customerPhone: message.sender,
    });

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
        timestamp: message.timestamp,
        inputType: message.input.type,
        inputLength: message.input.value.length,
      },
    });

    if (isDuplicate) {
      duplicateCount += 1;
      continue;
    }

    await recordWaMessageEvent({
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
    });

    const missingKeys = getMissingWhatsAppConfigKeys(connection.config);
    if (missingKeys.length) {
      configErrors.push(...missingKeys);
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

    const responses = await processIncomingMessage({
      businessId: connection.businessId,
      customerPhone: message.sender,
      messageId: message.messageId,
      input: message.input,
    });

    for (const response of responses) {
      const result =
        response.type === "buttons"
          ? await sendWhatsAppButtons({
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
            ? await sendWhatsAppList({
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
            : await sendWhatsAppText({
                phoneNumberId: message.phoneNumberId,
                recipient: message.sender,
                message: response.text,
                config: connection.config,
                logContext: {
                  businessId: connection.businessId,
                  connectionId: connection.connectionId,
                  senderType: "BOT",
                },
              });

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
    }
  }

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

async function recordStatusEvents(
  statuses: ReturnType<typeof parseWhatsAppMessageStatuses>,
  options: WhatsAppWebhookOptions,
) {
  for (const item of statuses) {
    const connection = await resolveWhatsAppConnectionByPhoneNumber(item.phoneNumberId);
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
