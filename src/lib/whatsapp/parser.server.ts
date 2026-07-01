import "@tanstack/react-start/server-only";

export type IncomingWhatsAppTextMessage = {
  messageId: string;
  sender: string;
  phoneNumberId: string;
  text: string;
  timestamp: string;
};

type WhatsAppWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: {
          phone_number_id?: string;
        };
        messages?: Array<{
          from?: string;
          id?: string;
          timestamp?: string;
          type?: string;
          text?: {
            body?: string;
          };
        }>;
      };
    }>;
  }>;
};

export function parseIncomingWhatsAppTextMessages(
  payload: unknown,
): IncomingWhatsAppTextMessage[] {
  if (!isWebhookPayload(payload)) return [];

  const messages: IncomingWhatsAppTextMessage[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const phoneNumberId = change.value?.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      for (const message of change.value?.messages ?? []) {
        const text = message.text?.body?.trim();

        if (
          message.type !== "text" ||
          !message.id ||
          !message.from ||
          !message.timestamp ||
          !text
        ) {
          continue;
        }

        messages.push({
          messageId: message.id,
          sender: message.from,
          phoneNumberId,
          text,
          timestamp: message.timestamp,
        });
      }
    }
  }

  return messages;
}

function isWebhookPayload(payload: unknown): payload is WhatsAppWebhookPayload {
  return typeof payload === "object" && payload !== null;
}
