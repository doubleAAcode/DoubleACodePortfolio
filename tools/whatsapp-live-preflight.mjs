#!/usr/bin/env node

import { createHmac, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";

const DEFAULT_ORIGIN = "https://www.doubleacode.com";
const DEFAULT_TIMEOUT_MS = 12_000;

const envFile = process.argv[2];
if (!envFile) {
  console.error(
    "Usage: npm run smoke:whatsapp:preflight -- <ignored-production-env-file> [origin]",
  );
  process.exit(2);
}

const fileEnvironment = parseEnv(await readFile(envFile, "utf8"));
const origin = normalizeOrigin(
  process.argv[3] ||
    process.env.CONNECT_PRODUCTION_ORIGIN ||
    fileEnvironment.CONNECT_PRODUCTION_ORIGIN ||
    DEFAULT_ORIGIN,
);
const suffixes = getConfiguredSuffixes(fileEnvironment);

const targets = [
  {
    label: "primary",
    suffix: "",
    routes: ["/api/whatsapp/webhook"],
  },
  ...(suffixes.includes("2")
    ? [
        {
          label: "secondary",
          suffix: "2",
          routes: ["/api/connect/whatsapp/webhook", "/api/whatsapp/webhook-2"],
        },
      ]
    : []),
];

const results = [];
for (const target of targets) {
  results.push(await verifyTarget({ environment: fileEnvironment, origin, ...target }));
}

console.log(JSON.stringify({ ok: results.every((result) => result.ok), origin, results }, null, 2));
if (results.some((result) => !result.ok)) process.exitCode = 1;

async function verifyTarget({ environment, label, origin: targetOrigin, routes, suffix }) {
  const config = getConfig(environment, suffix);
  const missingKeys = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  const unavailableSensitiveKeys = Object.entries(config)
    .filter(([, value]) => isSensitivePlaceholder(value))
    .map(([key]) => key);

  if (missingKeys.length || unavailableSensitiveKeys.length) {
    return { label, ok: false, missingKeys, unavailableSensitiveKeys, routes: [] };
  }

  const routeResults = [];
  for (const route of routes) {
    const challenge = randomBytes(12).toString("hex");
    const verificationUrl = new URL(route, targetOrigin);
    verificationUrl.searchParams.set("hub.mode", "subscribe");
    verificationUrl.searchParams.set("hub.verify_token", config.verifyToken);
    verificationUrl.searchParams.set("hub.challenge", challenge);

    const verification = await fetchWithTimeout(verificationUrl);
    const verificationBody = await verification.text();

    const rejectedVerificationUrl = new URL(verificationUrl);
    rejectedVerificationUrl.searchParams.set("hub.verify_token", `${config.verifyToken}-invalid`);
    const rejectedVerification = await fetchWithTimeout(rejectedVerificationUrl);

    const emptyEnvelope = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
    const acceptedSignature = await fetchWithTimeout(new URL(route, targetOrigin), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": `sha256=${createHmac("sha256", config.appSecret)
          .update(emptyEnvelope)
          .digest("hex")}`,
      },
      body: emptyEnvelope,
    });
    const rejectedSignature = await fetchWithTimeout(new URL(route, targetOrigin), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": "sha256=invalid",
      },
      body: emptyEnvelope,
    });

    routeResults.push({
      route,
      verificationStatus: verification.status,
      challengeMatches: verificationBody === challenge,
      invalidVerificationStatus: rejectedVerification.status,
      validSignatureStatus: acceptedSignature.status,
      invalidSignatureStatus: rejectedSignature.status,
    });
  }

  const graphUrl = new URL(
    `${config.graphApiVersion}/${encodeURIComponent(config.phoneNumberId)}`,
    "https://graph.facebook.com",
  );
  graphUrl.searchParams.set(
    "fields",
    "id,display_phone_number,verified_name,quality_rating,code_verification_status",
  );
  const graphResponse = await fetchWithTimeout(graphUrl, {
    headers: { authorization: `Bearer ${config.accessToken}` },
  });
  const graphBody = await graphResponse.json().catch(() => null);

  const routesOk = routeResults.every(
    (result) =>
      result.verificationStatus === 200 &&
      result.challengeMatches &&
      result.invalidVerificationStatus === 403 &&
      result.validSignatureStatus === 200 &&
      result.invalidSignatureStatus === 403,
  );
  const graphOk = graphResponse.ok && graphBody?.id === config.phoneNumberId;

  return {
    label,
    ok: routesOk && graphOk,
    routes: routeResults,
    graph: {
      status: graphResponse.status,
      identityMatches: graphBody?.id === config.phoneNumberId,
      displayNumberPresent: Boolean(graphBody?.display_phone_number),
      verifiedNamePresent: Boolean(graphBody?.verified_name),
      qualityRating: graphBody?.quality_rating ?? null,
      codeVerificationStatus: graphBody?.code_verification_status ?? null,
      errorCode: graphBody?.error?.code ?? null,
    },
  };
}

function getConfig(environment, suffix) {
  const key = (name) => (suffix ? `${name}_${suffix}` : name);
  return {
    accessToken: environment[key("WHATSAPP_ACCESS_TOKEN")] || "",
    appSecret: environment[key("WHATSAPP_APP_SECRET")] || "",
    businessAccountId: environment[key("WHATSAPP_BUSINESS_ACCOUNT_ID")] || "",
    graphApiVersion:
      environment[key("WHATSAPP_GRAPH_API_VERSION")] ||
      environment.WHATSAPP_GRAPH_API_VERSION ||
      "v23.0",
    phoneNumberId: environment[key("WHATSAPP_PHONE_NUMBER_ID")] || "",
    verifyToken: environment[key("WHATSAPP_VERIFY_TOKEN")] || "",
  };
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeOrigin(value) {
  return value.replace(/\/$/, "");
}

function isSensitivePlaceholder(value) {
  return /^\[(?:sensitive|encrypted|redacted)\]$/i.test(value.trim());
}

function getConfiguredSuffixes(environment) {
  const explicit = (environment.WHATSAPP_CONNECTION_SUFFIXES || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const inferred = Object.keys(environment)
    .map(
      (key) =>
        key.match(
          /^WHATSAPP_(?:ACCESS_TOKEN|PHONE_NUMBER_ID|BUSINESS_ACCOUNT_ID|VERIFY_TOKEN|APP_SECRET)_(.+)$/,
        )?.[1],
    )
    .filter(Boolean);

  return [...new Set([...explicit, ...inferred])];
}
