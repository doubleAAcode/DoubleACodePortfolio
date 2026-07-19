export type StoredConversationSessionSnapshot = {
  business_id: string;
  customer_phone: string;
  current_step: string;
  language: string | null;
  context: unknown;
};

export type ConversationRecoveryResult<Step extends string, Language extends string> = {
  currentStep: Step;
  language?: Language;
  context: Record<string, unknown>;
  recovered: boolean;
  issues: string[];
};

export type WhatsAppConnectionCandidate = {
  connectionId: string;
  businessId: string;
  phoneNumberId: string;
  configSuffix: string;
  isActive: boolean;
};

export type BusinessOperationalStatus =
  | "DRAFT"
  | "SETUP_INCOMPLETE"
  | "ACTIVE"
  | "PAUSED"
  | "SUSPENDED"
  | "ERROR";

export function maskCustomerIdentifier(value: string) {
  if (!value) return "";
  if (value.length <= 4) return "****";
  return `${"*".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

export function getCustomerPhoneLookupCandidates(value: string) {
  const compact = value.trim().replace(/[\s()-]/g, "");
  if (!compact) return [];

  const digits = compact.startsWith("+") ? compact.slice(1) : compact;
  const candidates = [compact];

  if (/^\d{8,15}$/.test(digits)) {
    candidates.push(digits);
    candidates.push(`+${digits}`);
  }

  return Array.from(new Set(candidates));
}

export function calculateAvailableStock({
  stockQuantity,
  activeReservedQuantity,
}: {
  stockQuantity: number;
  activeReservedQuantity: number;
}) {
  return Math.max(0, Math.trunc(stockQuantity) - Math.max(0, Math.trunc(activeReservedQuantity)));
}

export function isRetryableHttpStatus(status: number) {
  return status === 0 || status === 408 || status === 425 || status === 429 || status >= 500;
}

export function sanitizeExternalErrorMessage(message: string | undefined, fallback: string) {
  const cleanMessage = message?.replace(/\s+/g, " ").trim();
  return cleanMessage ? `${fallback}: ${cleanMessage.slice(0, 180)}` : fallback;
}

export function validateStoredConversationSession<Step extends string, Language extends string>({
  row,
  validSteps,
  validLanguages,
  defaultStep,
  defaultStepWithLanguage,
}: {
  row: StoredConversationSessionSnapshot;
  validSteps: ReadonlySet<Step>;
  validLanguages: ReadonlySet<Language>;
  defaultStep: Step;
  defaultStepWithLanguage: Step;
}): ConversationRecoveryResult<Step, Language> {
  const issues: string[] = [];
  const language =
    row.language && validLanguages.has(row.language as Language)
      ? (row.language as Language)
      : undefined;

  if (row.language && !language) {
    issues.push("invalid_language");
  }

  const context =
    row.context && typeof row.context === "object" && !Array.isArray(row.context)
      ? (row.context as Record<string, unknown>)
      : {};

  if (context !== row.context) {
    issues.push("invalid_context");
  }

  let currentStep = validSteps.has(row.current_step as Step)
    ? (row.current_step as Step)
    : language
      ? defaultStepWithLanguage
      : defaultStep;

  if (currentStep !== row.current_step) {
    issues.push("invalid_step");
  }

  if (!language && currentStep !== defaultStep) {
    currentStep = defaultStep;
    issues.push("missing_language_for_step");
  }

  return {
    currentStep,
    language,
    context,
    recovered: issues.length > 0,
    issues,
  };
}

export function selectWhatsAppConnectionForPhoneNumber({
  phoneNumberId,
  candidates,
}: {
  phoneNumberId: string;
  candidates: WhatsAppConnectionCandidate[];
}) {
  return candidates.find(
    (candidate) => candidate.isActive && candidate.phoneNumberId === phoneNumberId,
  );
}

export function canBusinessProcessMessages({
  isActive,
  status,
}: {
  isActive: boolean;
  status?: string | null;
}) {
  return isActive && (!status || status === "ACTIVE");
}
