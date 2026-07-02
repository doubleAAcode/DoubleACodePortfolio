import "@tanstack/react-start/server-only";
import process from "node:process";

export type WhatsAppServerConfig = {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  verifyToken: string;
  appSecret: string;
  graphApiVersion: string;
  envSuffix: string;
};

const DEFAULT_GRAPH_API_VERSION = "v23.0";

export function getWhatsAppServerConfig(envSuffix = ""): WhatsAppServerConfig {
  return {
    accessToken: getEnvValue("WHATSAPP_ACCESS_TOKEN", envSuffix),
    phoneNumberId: getEnvValue("WHATSAPP_PHONE_NUMBER_ID", envSuffix),
    businessAccountId: getEnvValue("WHATSAPP_BUSINESS_ACCOUNT_ID", envSuffix),
    verifyToken: getEnvValue("WHATSAPP_VERIFY_TOKEN", envSuffix),
    appSecret: getEnvValue("WHATSAPP_APP_SECRET", envSuffix),
    graphApiVersion:
      getEnvValue("WHATSAPP_GRAPH_API_VERSION", envSuffix) ||
      process.env.WHATSAPP_GRAPH_API_VERSION ||
      DEFAULT_GRAPH_API_VERSION,
    envSuffix,
  };
}

export function getMissingWhatsAppConfigKeys(config = getWhatsAppServerConfig()) {
  return [
    [formatEnvKey("WHATSAPP_ACCESS_TOKEN", config.envSuffix), config.accessToken],
    [formatEnvKey("WHATSAPP_PHONE_NUMBER_ID", config.envSuffix), config.phoneNumberId],
    [formatEnvKey("WHATSAPP_BUSINESS_ACCOUNT_ID", config.envSuffix), config.businessAccountId],
    [formatEnvKey("WHATSAPP_VERIFY_TOKEN", config.envSuffix), config.verifyToken],
    [formatEnvKey("WHATSAPP_APP_SECRET", config.envSuffix), config.appSecret],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

function getEnvValue(baseKey: string, envSuffix: string) {
  return process.env[formatEnvKey(baseKey, envSuffix)] ?? "";
}

function formatEnvKey(baseKey: string, envSuffix: string) {
  return envSuffix ? `${baseKey}_${envSuffix}` : baseKey;
}
