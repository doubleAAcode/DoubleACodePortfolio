import "@tanstack/react-start/server-only";

import { getWhatsAppServerConfig, type WhatsAppServerConfig } from "./config.server";

const WHATSAPP_SEND_TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 300;

export type SendWhatsAppTextInput = {
  phoneNumberId: string;
  recipient: string;
  message: string;
  config?: WhatsAppServerConfig;
};

export type SendWhatsAppButtonsInput = {
  phoneNumberId: string;
  recipient: string;
  body: string;
  buttons: Array<{
    id: string;
    title: string;
  }>;
  config?: WhatsAppServerConfig;
};

export type SendWhatsAppListInput = {
  phoneNumberId: string;
  recipient: string;
  body: string;
  buttonText: string;
  sections: Array<{
    title: string;
    rows: Array<{
      id: string;
      title: string;
      description?: string;
    }>;
  }>;
  config?: WhatsAppServerConfig;
};

export type SendResult =
  | {
      ok: true;
      messageId?: string;
    }
  | {
      ok: false;
      status: number;
      errorCode?: string;
      errorMessage: string;
      retryable?: boolean;
    };

type GraphSendResponse = {
  messages?: Array<{ id?: string }>;
  error?: {
    code?: number | string;
    message?: string;
    error_subcode?: number | string;
    type?: string;
  };
};

export async function sendWhatsAppText({
  phoneNumberId,
  recipient,
  message,
  config,
}: SendWhatsAppTextInput): Promise<SendResult> {
  return sendWhatsAppPayload({
    phoneNumberId,
    config,
    payload: {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "text",
      text: {
        preview_url: false,
        body: message,
      },
    },
  });
}

export async function sendWhatsAppButtons({
  phoneNumberId,
  recipient,
  body,
  buttons,
  config,
}: SendWhatsAppButtonsInput): Promise<SendResult> {
  return sendWhatsAppPayload({
    phoneNumberId,
    config,
    payload: {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: body,
        },
        action: {
          buttons: buttons.map((button) => ({
            type: "reply",
            reply: {
              id: button.id,
              title: button.title,
            },
          })),
        },
      },
    },
  });
}

export async function sendWhatsAppList({
  phoneNumberId,
  recipient,
  body,
  buttonText,
  sections,
  config,
}: SendWhatsAppListInput): Promise<SendResult> {
  return sendWhatsAppPayload({
    phoneNumberId,
    config,
    payload: {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "interactive",
      interactive: {
        type: "list",
        body: {
          text: body,
        },
        action: {
          button: buttonText,
          sections: sections.map((section) => ({
            title: section.title,
            rows: section.rows.map((row) => ({
              id: row.id,
              title: row.title,
              ...(row.description ? { description: row.description } : {}),
            })),
          })),
        },
      },
    },
  });
}

async function sendWhatsAppPayload({
  phoneNumberId,
  config = getWhatsAppServerConfig(),
  payload,
}: {
  phoneNumberId: string;
  config?: WhatsAppServerConfig;
  payload: Record<string, unknown>;
}): Promise<SendResult> {
  if (!config.accessToken) {
    return {
      ok: false,
      status: 500,
      errorMessage: "WhatsApp access token is not configured.",
      retryable: false,
    };
  }

  if (!phoneNumberId) {
    return {
      ok: false,
      status: 500,
      errorMessage: "WhatsApp phone number ID is not configured.",
      retryable: false,
    };
  }

  const url = `https://graph.facebook.com/${config.graphApiVersion}/${phoneNumberId}/messages`;
  const first = await sendGraphRequest({ url, accessToken: config.accessToken, payload });
  if (first.ok || !first.retryable) return first;

  await delay(RETRY_DELAY_MS);
  const second = await sendGraphRequest({ url, accessToken: config.accessToken, payload });
  return second.ok ? second : { ...second, retryable: isRetryableStatus(second.status) };
}

async function sendGraphRequest({
  url,
  accessToken,
  payload,
}: {
  url: string;
  accessToken: string;
  payload: Record<string, unknown>;
}): Promise<SendResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WHATSAPP_SEND_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const graphPayload = (await response.json().catch(() => ({}))) as GraphSendResponse;

    if (!response.ok) {
      const errorCode =
        graphPayload.error?.code == null ? undefined : String(graphPayload.error.code);
      return {
        ok: false,
        status: response.status,
        errorCode,
        errorMessage: sanitizeMetaError(graphPayload),
        retryable: isRetryableStatus(response.status),
      };
    }

    return {
      ok: true,
      messageId: graphPayload.messages?.[0]?.id,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      errorCode: error instanceof Error && error.name === "AbortError" ? "TIMEOUT" : undefined,
      errorMessage:
        error instanceof Error && error.name === "AbortError"
          ? "WhatsApp message send timed out."
          : "WhatsApp message send failed before receiving a response.",
      retryable: true,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function sanitizeMetaError(payload: GraphSendResponse) {
  const message = payload.error?.message?.trim();
  return message
    ? `WhatsApp message send failed: ${message.slice(0, 180)}`
    : "WhatsApp message send failed.";
}

function isRetryableStatus(status: number) {
  return status === 0 || status === 408 || status === 425 || status === 429 || status >= 500;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
