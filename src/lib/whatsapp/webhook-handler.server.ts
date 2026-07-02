import "@tanstack/react-start/server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import {
  getMissingWhatsAppConfigKeys,
  getWhatsAppServerConfig,
} from "@/lib/whatsapp/config.server";
import { processIncomingMessage } from "@/lib/whatsapp/conversation-engine.server";
import { hasProcessedWhatsAppMessage } from "@/lib/whatsapp/duplicates.server";
import { parseIncomingWhatsAppMessages } from "@/lib/whatsapp/parser.server";
import {
  sendWhatsAppButtons,
  sendWhatsAppList,
  sendWhatsAppText,
} from "@/lib/whatsapp/sender.server";
import { recordWhatsAppWebhookLog } from "@/lib/whatsapp/webhook-log-store.server";

export type WhatsAppWebhookOptions = {
  businessId: string;
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
  });

  return new Response("Forbidden", { status: 403 });
}

async function handleWebhookEvent(request: Request, options: WhatsAppWebhookOptions) {
  const rawBody = await request.text();
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
  const missingKeys = getMissingWhatsAppConfigKeys(config);

  if (!messages.length) {
    console.info(`[${options.logLabel}] no supported messages in payload`);
    void recordWhatsAppWebhookLog({
      method: request.method,
      url: request.url,
      headers: request.headers,
      status: 200,
      result: `${options.logLabel}:no_supported_messages`,
    });
    return Response.json({ ok: true, processed: 0 });
  }

  let duplicateCount = 0;
  let sendFailureCount = 0;
  const messageIds: string[] = [];
  const inputTypes: string[] = [];
  const senderMasks: string[] = [];
  const phoneNumberIds: string[] = [];

  for (const message of messages) {
    const isDuplicate = await hasProcessedWhatsAppMessage({
      messageId: message.messageId,
      businessId: options.businessId,
      customerPhone: message.sender,
    });
    messageIds.push(message.messageId);
    inputTypes.push(message.input.type);
    senderMasks.push(maskPhoneNumber(message.sender));
    phoneNumberIds.push(message.phoneNumberId);

    console.info(`[${options.logLabel}] incoming message`, {
      messageId: message.messageId,
      sender: maskPhoneNumber(message.sender),
      phoneNumberId: message.phoneNumberId,
      timestamp: message.timestamp,
      duplicate: isDuplicate,
      inputType: message.input.type,
      inputLength: message.input.value.length,
      businessId: options.businessId,
    });

    if (isDuplicate) {
      duplicateCount += 1;
      continue;
    }

    if (missingKeys.length) {
      console.error(`[${options.logLabel}] missing required env`, { keys: missingKeys });
      continue;
    }

    const responses = await processIncomingMessage({
      businessId: options.businessId,
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
              config,
            })
          : response.type === "list"
            ? await sendWhatsAppList({
                phoneNumberId: message.phoneNumberId,
                recipient: message.sender,
                body: response.body,
                buttonText: response.buttonText,
                sections: response.sections,
                config,
              })
            : await sendWhatsAppText({
                phoneNumberId: message.phoneNumberId,
                recipient: message.sender,
                message: response.text,
                config,
              });

      if (!result.ok) {
        sendFailureCount += 1;
        console.error(`[${options.logLabel}] message send failed`, {
          status: result.status,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
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
    inputTypes,
    result: sendFailureCount
      ? `${options.logLabel}:processed_with_send_failures`
      : `${options.logLabel}:processed`,
    errorSummary: missingKeys.length
      ? `Missing env: ${missingKeys.join(", ")}`
      : sendFailureCount
        ? `${sendFailureCount} send failure(s)`
        : undefined,
  });

  return Response.json({ ok: true, processed: messages.length });
}

function maskPhoneNumber(phone: string) {
  if (phone.length <= 4) return "****";
  return `${"*".repeat(Math.max(0, phone.length - 4))}${phone.slice(-4)}`;
}

function safeJsonParse(rawBody: string) {
  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
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
