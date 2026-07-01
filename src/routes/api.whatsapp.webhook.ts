import { createFileRoute } from "@tanstack/react-router";
import {
  getMissingWhatsAppConfigKeys,
  getWhatsAppServerConfig,
} from "@/lib/whatsapp/config.server";
import { hasProcessedWhatsAppMessage } from "@/lib/whatsapp/duplicates.server";
import { parseIncomingWhatsAppTextMessages } from "@/lib/whatsapp/parser.server";
import { sendWhatsAppText } from "@/lib/whatsapp/sender.server";

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
  const messages = parseIncomingWhatsAppTextMessages(payload);
  const config = getWhatsAppServerConfig();
  const missingKeys = getMissingWhatsAppConfigKeys(config);

  if (!messages.length) {
    console.info("[whatsapp:webhook] no text messages in payload");
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
      textLength: message.text.length,
    });

    if (isDuplicate) continue;

    if (missingKeys.length) {
      console.error("[whatsapp:webhook] missing required env", { keys: missingKeys });
      continue;
    }

    const result = await sendWhatsAppText({
      phoneNumberId: config.phoneNumberId || message.phoneNumberId,
      recipient: message.sender,
      message: `Received: ${message.text}`,
    });

    if (!result.ok) {
      console.error("[whatsapp:webhook] echo send failed", {
        status: result.status,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
      });
    }
  }

  return Response.json({ ok: true, processed: messages.length });
}

function maskPhoneNumber(phone: string) {
  if (phone.length <= 4) return "****";
  return `${"*".repeat(Math.max(0, phone.length - 4))}${phone.slice(-4)}`;
}
