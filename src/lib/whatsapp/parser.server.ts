import "@tanstack/react-start/server-only";

export type IncomingWhatsAppMessage = {
  messageId: string;
  sender: string;
  phoneNumberId: string;
  timestamp: string;
  input: {
    type: "text" | "button" | "unknown";
    value: string;
  };
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
          interactive?: {
            type?: string;
            button_reply?: {
              id?: string;
              title?: string;
            };
          };
          button?: {
            text?: string;
            payload?: string;
          };
        }>;
      };
    }>;
  }>;
};

export function parseIncomingWhatsAppMessages(
  payload: unknown,
): IncomingWhatsAppMessage[] {
  if (!isWebhookPayload(payload)) return [];

  const messages: IncomingWhatsAppMessage[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const phoneNumberId = change.value?.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      for (const message of change.value?.messages ?? []) {
        if (!message.id || !message.from || !message.timestamp) {
          continue;
        }

        const input = parseMessageInput(message);

        messages.push({
          messageId: message.id,
          sender: message.from,
          phoneNumberId,
          timestamp: message.timestamp,
          input,
        });
      }
    }
  }

  return messages;
}

function parseMessageInput(message: {
  type?: string;
  text?: { body?: string };
  interactive?: {
    type?: string;
    button_reply?: {
      id?: string;
      title?: string;
    };
  };
  button?: {
    text?: string;
    payload?: string;
  };
}): IncomingWhatsAppMessage["input"] {
  if (message.type === "text") {
    return {
      type: "text",
      value: message.text?.body?.trim() ?? "",
    };
  }

  if (message.type === "interactive" && message.interactive?.type === "button_reply") {
    return {
      type: "button",
      value:
        message.interactive.button_reply?.id?.trim() ||
        message.interactive.button_reply?.title?.trim() ||
        "",
    };
  }

  if (message.type === "button") {
    return {
      type: "button",
      value: message.button?.payload?.trim() || message.button?.text?.trim() || "",
    };
  }

  return {
    type: "unknown",
    value: message.type ?? "unknown",
  };
}

function isWebhookPayload(payload: unknown): payload is WhatsAppWebhookPayload {
  return typeof payload === "object" && payload !== null;
}
