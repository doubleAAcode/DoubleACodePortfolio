import "@tanstack/react-start/server-only";

export type IncomingWhatsAppMessage = {
  messageId: string;
  sender: string;
  phoneNumberId: string;
  timestamp: string;
  input: {
    type: "text" | "button" | "list" | "location" | "unknown";
    value: string;
    latitude?: number;
    longitude?: number;
  };
};

export type IncomingWhatsAppStatus = {
  messageId: string;
  recipient: string;
  phoneNumberId: string;
  timestamp: string;
  status: "sent" | "delivered" | "read" | "failed" | "unknown";
  errorCode?: string;
  errorMessage?: string;
};

type WhatsAppWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: {
          phone_number_id?: string;
        };
        statuses?: Array<{
          id?: string;
          status?: string;
          timestamp?: string;
          recipient_id?: string;
          errors?: Array<{
            code?: number | string;
            title?: string;
            message?: string;
            error_data?: {
              details?: string;
            };
          }>;
        }>;
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
            list_reply?: {
              id?: string;
              title?: string;
              description?: string;
            };
          };
          button?: {
            text?: string;
            payload?: string;
          };
          location?: {
            latitude?: number;
            longitude?: number;
            name?: string;
            address?: string;
          };
        }>;
      };
    }>;
  }>;
};

export function parseIncomingWhatsAppMessages(payload: unknown): IncomingWhatsAppMessage[] {
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

export function parseWhatsAppMessageStatuses(payload: unknown): IncomingWhatsAppStatus[] {
  if (!isWebhookPayload(payload)) return [];

  const statuses: IncomingWhatsAppStatus[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const phoneNumberId = change.value?.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      for (const item of change.value?.statuses ?? []) {
        if (!item.id || !item.timestamp) continue;

        const firstError = item.errors?.[0];
        statuses.push({
          messageId: item.id,
          recipient: item.recipient_id ?? "",
          phoneNumberId,
          timestamp: item.timestamp,
          status: normalizeStatus(item.status),
          errorCode: firstError?.code == null ? undefined : String(firstError.code),
          errorMessage:
            firstError?.message ||
            firstError?.title ||
            firstError?.error_data?.details ||
            undefined,
        });
      }
    }
  }

  return statuses;
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
    list_reply?: {
      id?: string;
      title?: string;
      description?: string;
    };
  };
  button?: {
    text?: string;
    payload?: string;
  };
  location?: {
    latitude?: number;
    longitude?: number;
    name?: string;
    address?: string;
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

  if (message.type === "interactive" && message.interactive?.type === "list_reply") {
    return {
      type: "list",
      value:
        message.interactive.list_reply?.id?.trim() ||
        message.interactive.list_reply?.title?.trim() ||
        "",
    };
  }

  if (message.type === "button") {
    return {
      type: "button",
      value: message.button?.payload?.trim() || message.button?.text?.trim() || "",
    };
  }

  if (message.type === "location") {
    return {
      type: "location",
      value: [message.location?.name, message.location?.address].filter(Boolean).join(" - "),
      latitude: message.location?.latitude,
      longitude: message.location?.longitude,
    };
  }

  return {
    type: "unknown",
    value: message.type ?? "unknown",
  };
}

function normalizeStatus(status?: string): IncomingWhatsAppStatus["status"] {
  if (status === "sent" || status === "delivered" || status === "read" || status === "failed") {
    return status;
  }
  return "unknown";
}

function isWebhookPayload(payload: unknown): payload is WhatsAppWebhookPayload {
  return typeof payload === "object" && payload !== null;
}
