import "@tanstack/react-start/server-only";
import process from "node:process";

export type WhatsAppServerConfig = {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  verifyToken: string;
  graphApiVersion: string;
};

const DEFAULT_GRAPH_API_VERSION = "v23.0";

export function getWhatsAppServerConfig(): WhatsAppServerConfig {
  return {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ?? "",
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? "",
    graphApiVersion: process.env.WHATSAPP_GRAPH_API_VERSION ?? DEFAULT_GRAPH_API_VERSION,
  };
}

export function getMissingWhatsAppConfigKeys(config = getWhatsAppServerConfig()) {
  return [
    ["WHATSAPP_ACCESS_TOKEN", config.accessToken],
    ["WHATSAPP_PHONE_NUMBER_ID", config.phoneNumberId],
    ["WHATSAPP_BUSINESS_ACCOUNT_ID", config.businessAccountId],
    ["WHATSAPP_VERIFY_TOKEN", config.verifyToken],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);
}
