import "@tanstack/react-start/server-only";
import { getWhatsAppServerConfig } from "./config.server";

export type SendWhatsAppTextInput = {
  phoneNumberId: string;
  recipient: string;
  message: string;
};

export type SendWhatsAppButtonsInput = {
  phoneNumberId: string;
  recipient: string;
  body: string;
  buttons: Array<{
    id: string;
    title: string;
  }>;
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
    };

type GraphSendResponse = {
  messages?: Array<{ id?: string }>;
  error?: {
    code?: number | string;
  };
};

export async function sendWhatsAppText({
  phoneNumberId,
  recipient,
  message,
}: SendWhatsAppTextInput): Promise<SendResult> {
  const config = getWhatsAppServerConfig();

  if (!config.accessToken) {
    return {
      ok: false,
      status: 500,
      errorMessage: "WhatsApp access token is not configured.",
    };
  }

  if (!phoneNumberId) {
    return {
      ok: false,
      status: 500,
      errorMessage: "WhatsApp phone number ID is not configured.",
    };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${config.graphApiVersion}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipient,
          type: "text",
          text: {
            preview_url: false,
            body: message,
          },
        }),
      },
    );

    const payload = (await response.json().catch(() => ({}))) as GraphSendResponse;

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        errorCode: payload.error?.code == null ? undefined : String(payload.error.code),
        errorMessage: "WhatsApp message send failed.",
      };
    }

    return {
      ok: true,
      messageId: payload.messages?.[0]?.id,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      errorMessage: "WhatsApp message send failed before receiving a response.",
    };
  }
}

export async function sendWhatsAppButtons({
  phoneNumberId,
  recipient,
  body,
  buttons,
}: SendWhatsAppButtonsInput): Promise<SendResult> {
  return sendWhatsAppPayload({
    phoneNumberId,
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

async function sendWhatsAppPayload({
  phoneNumberId,
  payload,
}: {
  phoneNumberId: string;
  payload: Record<string, unknown>;
}): Promise<SendResult> {
  const config = getWhatsAppServerConfig();

  if (!config.accessToken) {
    return {
      ok: false,
      status: 500,
      errorMessage: "WhatsApp access token is not configured.",
    };
  }

  if (!phoneNumberId) {
    return {
      ok: false,
      status: 500,
      errorMessage: "WhatsApp phone number ID is not configured.",
    };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${config.graphApiVersion}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    const graphPayload = (await response.json().catch(() => ({}))) as GraphSendResponse;

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        errorCode: graphPayload.error?.code == null ? undefined : String(graphPayload.error.code),
        errorMessage: "WhatsApp message send failed.",
      };
    }

    return {
      ok: true,
      messageId: graphPayload.messages?.[0]?.id,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      errorMessage: "WhatsApp message send failed before receiving a response.",
    };
  }
}
