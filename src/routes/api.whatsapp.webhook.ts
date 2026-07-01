import { createFileRoute } from "@tanstack/react-router";
import {
  getMissingWhatsAppConfigKeys,
  getWhatsAppServerConfig,
} from "@/lib/whatsapp/config.server";
import {
  DOUBLE_A_TEST_BUSINESS_ID,
  processIncomingMessage,
} from "@/lib/whatsapp/conversation-engine.server";
import { hasProcessedWhatsAppMessage } from "@/lib/whatsapp/duplicates.server";
import { parseIncomingWhatsAppMessages } from "@/lib/whatsapp/parser.server";
import {
  sendWhatsAppButtons,
  sendWhatsAppList,
  sendWhatsAppText,
} from "@/lib/whatsapp/sender.server";
import { recordWhatsAppWebhookLog } from "@/lib/whatsapp/webhook-log-store.server";

export const Route = createFileRoute("/api/whatsapp/webhook")({
  server: {
    handlers: {
      GET: ({ request }) => verifyWebhook(request),
      POST: ({ request }) => handleWebhookEvent(request),
    },
  },
});

function verifyWebhook(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const verifyToken = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const config = getWhatsAppServerConfig();

  if (mode === "subscribe" && verifyToken === config.verifyToken && challenge) {
    void recordWhatsAppWebhookLog({
      method: request.method,
      url: request.url,
      headers: request.headers,
      status: 200,
      result: "verification_ok",
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
    result: "verification_forbidden",
  });

  return new Response("Forbidden", { status: 403 });
}

async function handleWebhookEvent(request: Request) {
  const payload = await request.json().catch(() => null);
  const messages = parseIncomingWhatsAppMessages(payload);
  const config = getWhatsAppServerConfig();
  const missingKeys = getMissingWhatsAppConfigKeys(config);

  if (!messages.length) {
    console.info("[whatsapp:webhook] no supported messages in payload");
    void recordWhatsAppWebhookLog({
      method: request.method,
      url: request.url,
      headers: request.headers,
      status: 200,
      result: "no_supported_messages",
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
    const isDuplicate = hasProcessedWhatsAppMessage(message.messageId);
    messageIds.push(message.messageId);
    inputTypes.push(message.input.type);
    senderMasks.push(maskPhoneNumber(message.sender));
    phoneNumberIds.push(message.phoneNumberId);

    console.info("[whatsapp:webhook] incoming message", {
      messageId: message.messageId,
      sender: maskPhoneNumber(message.sender),
      phoneNumberId: message.phoneNumberId,
      timestamp: message.timestamp,
      duplicate: isDuplicate,
      inputType: message.input.type,
      inputLength: message.input.value.length,
    });

    if (isDuplicate) {
      duplicateCount += 1;
      continue;
    }

    if (missingKeys.length) {
      console.error("[whatsapp:webhook] missing required env", { keys: missingKeys });
      continue;
    }

    const responses = await processIncomingMessage({
      businessId: DOUBLE_A_TEST_BUSINESS_ID,
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
            })
          : response.type === "list"
            ? await sendWhatsAppList({
                phoneNumberId: message.phoneNumberId,
                recipient: message.sender,
                body: response.body,
                buttonText: response.buttonText,
                sections: response.sections,
              })
            : await sendWhatsAppText({
                phoneNumberId: message.phoneNumberId,
                recipient: message.sender,
                message: response.text,
              });

      if (!result.ok) {
        sendFailureCount += 1;
        console.error("[whatsapp:webhook] message send failed", {
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
    result: sendFailureCount ? "processed_with_send_failures" : "processed",
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
