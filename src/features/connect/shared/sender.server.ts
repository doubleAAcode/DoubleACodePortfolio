import "@tanstack/react-start/server-only";

import { getWhatsAppServerConfig, type WhatsAppServerConfig } from "./config.server";
import { recordWaMessageEvent, type WaMessageSenderType } from "./message-events.server";
import { isRetryableHttpStatus, sanitizeExternalErrorMessage } from "./reliability";

const WHATSAPP_SEND_TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 300;

export type SendWhatsAppTextInput = {
  phoneNumberId: string;
  recipient: string;
  message: string;
  config?: WhatsAppServerConfig;
  logContext?: OutboundLogContext;
};

export type SendWhatsAppTemplateInput = {
  phoneNumberId: string;
  recipient: string;
  templateName: string;
  language: string;
  config?: WhatsAppServerConfig;
  logContext?: OutboundLogContext;
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
  logContext?: OutboundLogContext;
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
  logContext?: OutboundLogContext;
};

export type SendWhatsAppImageInput = {
  phoneNumberId: string;
  recipient: string;
  imageUrl: string;
  caption?: string;
  config?: WhatsAppServerConfig;
  logContext?: OutboundLogContext;
};

type OutboundLogContext = {
  businessId?: string;
  connectionId?: string;
  senderType?: Extract<WaMessageSenderType, "BOT" | "HUMAN" | "SYSTEM">;
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
  logContext,
}: SendWhatsAppTextInput): Promise<SendResult> {
  const result = await sendWhatsAppPayload({
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
  await logOutboundMessage({
    result,
    phoneNumberId,
    recipient,
    messageType: "text",
    body: message,
    summary: message,
    logContext,
  });
  return result;
}

export async function sendWhatsAppTemplate({
  phoneNumberId,
  recipient,
  templateName,
  language,
  config,
  logContext,
}: SendWhatsAppTemplateInput): Promise<SendResult> {
  const result = await sendWhatsAppPayload({
    phoneNumberId,
    config,
    payload: {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "template",
      template: {
        name: templateName,
        language: { code: language },
      },
    },
  });
  await logOutboundMessage({
    result,
    phoneNumberId,
    recipient,
    messageType: "template",
    body: `Template: ${templateName}`,
    summary: `Template ${templateName} (${language})`,
    logContext,
  });
  return result;
}

export async function sendWhatsAppButtons({
  phoneNumberId,
  recipient,
  body,
  buttons,
  config,
  logContext,
}: SendWhatsAppButtonsInput): Promise<SendResult> {
  const result = await sendWhatsAppPayload({
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
  await logOutboundMessage({
    result,
    phoneNumberId,
    recipient,
    messageType: "button",
    body,
    summary: `${body} Buttons: ${buttons.map((button) => button.title).join(", ")}`,
    logContext,
  });
  return result;
}

export async function sendWhatsAppList({
  phoneNumberId,
  recipient,
  body,
  buttonText,
  sections,
  config,
  logContext,
}: SendWhatsAppListInput): Promise<SendResult> {
  const result = await sendWhatsAppPayload({
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
  await logOutboundMessage({
    result,
    phoneNumberId,
    recipient,
    messageType: "list",
    body,
    summary: `${body} List button: ${buttonText}`,
    logContext,
  });
  return result;
}

export async function sendWhatsAppImage({
  phoneNumberId,
  recipient,
  imageUrl,
  caption,
  config,
  logContext,
}: SendWhatsAppImageInput): Promise<SendResult> {
  const result = await sendWhatsAppPayload({
    phoneNumberId,
    config,
    payload: {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "image",
      image: {
        link: imageUrl,
        ...(caption ? { caption } : {}),
      },
    },
  });
  await logOutboundMessage({
    result,
    phoneNumberId,
    recipient,
    messageType: "image",
    body: caption || imageUrl,
    summary: caption ? `${caption} Image: ${imageUrl}` : `Image: ${imageUrl}`,
    logContext,
  });
  return result;
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
  return second.ok ? second : { ...second, retryable: isRetryableHttpStatus(second.status) };
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
        retryable: isRetryableHttpStatus(response.status),
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
  return sanitizeExternalErrorMessage(payload.error?.message, "WhatsApp message send failed");
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function logOutboundMessage({
  result,
  phoneNumberId,
  recipient,
  messageType,
  body,
  summary,
  logContext,
}: {
  result: SendResult;
  phoneNumberId: string;
  recipient: string;
  messageType: "text" | "button" | "list" | "template" | "image";
  body: string;
  summary: string;
  logContext?: OutboundLogContext;
}) {
  if (!logContext) return;
  try {
    await recordWaMessageEvent({
      businessId: logContext.businessId,
      connectionId: logContext.connectionId,
      phoneNumberId,
      customerPhone: recipient,
      direction: "OUTBOUND",
      senderType: logContext.senderType ?? "BOT",
      messageType,
      body,
      summary,
      metaMessageId: result.ok ? result.messageId : undefined,
      status: result.ok ? "sent" : "failed",
      errorCode: result.ok ? undefined : result.errorCode,
      errorMessage: result.ok ? undefined : result.errorMessage,
    });
  } catch (error) {
    console.error("[connect:sender] outbound diagnostic write failed", {
      message: error instanceof Error ? error.message : "Unknown diagnostic failure",
    });
  }
}
