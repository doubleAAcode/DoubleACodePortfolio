import "@tanstack/react-start/server-only";

import { randomUUID } from "node:crypto";

import { maskCustomerIdentifier } from "./reliability";

type LogLevel = "info" | "warn" | "error";

export type WhatsAppLogContext = {
  correlationId?: string;
  operation: string;
  businessId?: string;
  phoneNumberId?: string;
  metaMessageId?: string;
  customerPhone?: string;
  orderId?: string;
  orderNumber?: string;
  result?: string;
  errorCode?: string;
  durationMs?: number;
  details?: Record<string, unknown>;
};

export function createCorrelationId(prefix = "wa") {
  return `${prefix}_${randomUUID()}`;
}

export function logWhatsAppInfo(context: WhatsAppLogContext) {
  writeLog("info", context);
}

export function logWhatsAppWarn(context: WhatsAppLogContext) {
  writeLog("warn", context);
}

export function logWhatsAppError(context: WhatsAppLogContext, error?: unknown) {
  writeLog("error", {
    ...context,
    details: {
      ...context.details,
      errorMessage: error instanceof Error ? error.message : undefined,
    },
  });
}

function writeLog(level: LogLevel, context: WhatsAppLogContext) {
  const { customerPhone, details, ...safeContext } = context;
  const payload = {
    ...safeContext,
    customer: customerPhone ? maskCustomerIdentifier(customerPhone) : undefined,
    details: redactDetails(details),
  };

  console[level]("[whatsapp]", payload);
}

function redactDetails(details?: Record<string, unknown>) {
  if (!details) return undefined;
  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(details)) {
    redacted[key] = /token|secret|key|authorization|address/i.test(key) ? "[redacted]" : value;
  }

  return redacted;
}
