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
import { sendWhatsAppButtons, sendWhatsAppText } from "@/lib/whatsapp/sender.server";

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
    return new Response(challenge, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return new Response("Forbidden", { status: 403 });
}

async function handleWebhookEvent(request: Request) {
  const payload = await request.json().catch(() => null);
  const messages = parseIncomingWhatsAppMessages(payload);
  const config = getWhatsAppServerConfig();
  const missingKeys = getMissingWhatsAppConfigKeys(config);

  if (!messages.length) {
    console.info("[whatsapp:webhook] no supported messages in payload");
    return Response.json({ ok: true, processed: 0 });
  }

  for (const message of messages) {
    const isDuplicate = hasProcessedWhatsAppMessage(message.messageId);

    console.info("[whatsapp:webhook] text message", {
      messageId: message.messageId,
      sender: maskPhoneNumber(message.sender),
      phoneNumberId: message.phoneNumberId,
      timestamp: message.timestamp,
      duplicate: isDuplicate,
      inputType: message.input.type,
      inputLength: message.input.value.length,
    });

    if (isDuplicate) continue;

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
          : await sendWhatsAppText({
              phoneNumberId: message.phoneNumberId,
              recipient: message.sender,
              message: response.text,
            });

      if (!result.ok) {
        console.error("[whatsapp:webhook] message send failed", {
          status: result.status,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
        });
      }
    }
  }

  return Response.json({ ok: true, processed: messages.length });
}

function maskPhoneNumber(phone: string) {
  if (phone.length <= 4) return "****";
  return `${"*".repeat(Math.max(0, phone.length - 4))}${phone.slice(-4)}`;
}
