import "@tanstack/react-start/server-only";
import {
  createConversationSession,
  deleteConversationSession,
  getActiveConversationSession,
  saveConversationSession,
  type ConversationLanguage,
  type ConversationSession,
} from "./conversation-store.server";

export const DOUBLE_A_TEST_BUSINESS_ID = "double-a-test-business";

export type ConversationInput = {
  type: "text" | "button" | "unknown";
  value: string;
};

export type BotResponse =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "buttons";
      body: string;
      buttons: Array<{
        id: string;
        title: string;
      }>;
    };

export async function processIncomingMessage({
  businessId,
  customerPhone,
  input,
}: {
  businessId: string;
  customerPhone: string;
  messageId: string;
  input: ConversationInput;
}): Promise<BotResponse[]> {
  const now = new Date();
  let session =
    getActiveConversationSession({ businessId, customerPhone, now }) ??
    createConversationSession({ businessId, customerPhone, now });

  const command = getGlobalCommand(input.value);

  if (command === "restart") {
    deleteConversationSession({ businessId, customerPhone });
    session = createConversationSession({ businessId, customerPhone, now });
    return [languageSelectionResponse()];
  }

  if (command === "menu") {
    if (!session.language) {
      return [languageSelectionResponse()];
    }

    saveConversationSession({ ...session, currentStep: "MAIN_MENU" }, now);
    return [mainMenuResponse(session.language)];
  }

  if (session.currentStep === "SELECT_LANGUAGE") {
    return handleLanguageSelection(session, input, now);
  }

  return handleMainMenu(session, input, now);
}

function handleLanguageSelection(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
): BotResponse[] {
  const language = parseLanguage(input.value);

  if (!language) {
    saveConversationSession(session, now);
    return [languageSelectionResponse()];
  }

  saveConversationSession(
    {
      ...session,
      language,
      currentStep: "MAIN_MENU",
    },
    now,
  );

  return [mainMenuResponse(language)];
}

function handleMainMenu(
  session: ConversationSession,
  input: ConversationInput,
  now: Date,
): BotResponse[] {
  const language = session.language ?? "en";
  const option = parseMainMenuOption(input.value);

  saveConversationSession(
    {
      ...session,
      language,
      currentStep: "MAIN_MENU",
      context: option ? { ...session.context, lastMenuSelection: option } : session.context,
    },
    now,
  );

  return [mainMenuResponse(language)];
}

function languageSelectionResponse(): BotResponse {
  return {
    type: "buttons",
    body: "Choose your language:",
    buttons: [
      { id: "language_en", title: "English" },
      { id: "language_ar", title: "العربية" },
    ],
  };
}

function mainMenuResponse(language: ConversationLanguage): BotResponse {
  if (language === "ar") {
    return {
      type: "buttons",
      body: "كيف يمكننا مساعدتك؟",
      buttons: [
        { id: "main_order", title: "تقديم طلب" },
        { id: "main_question", title: "طرح سؤال" },
        { id: "main_info", title: "معلومات المتجر" },
      ],
    };
  }

  return {
    type: "buttons",
    body: "How can we help?",
    buttons: [
      { id: "main_order", title: "Place an order" },
      { id: "main_question", title: "Ask a question" },
      { id: "main_info", title: "Store information" },
    ],
  };
}

function parseLanguage(value: string): ConversationLanguage | undefined {
  const normalized = normalize(value);

  if (["1", "english", "en", "language_en"].includes(normalized)) return "en";
  if (["2", "arabic", "ar", "العربية", "عربي", "language_ar"].includes(normalized)) {
    return "ar";
  }

  return undefined;
}

function parseMainMenuOption(value: string) {
  const normalized = normalize(value);

  if (["1", "main_order", "place an order", "تقديم طلب"].includes(normalized)) return "order";
  if (["2", "main_question", "ask a question", "طرح سؤال"].includes(normalized)) {
    return "question";
  }
  if (["3", "main_info", "store information", "معلومات المتجر"].includes(normalized)) {
    return "info";
  }

  return undefined;
}

function getGlobalCommand(value: string): "restart" | "menu" | undefined {
  const normalized = normalize(value);

  if (["restart", "start", "إعادة"].includes(normalized)) return "restart";
  if (["menu", "القائمة"].includes(normalized)) return "menu";

  return undefined;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}
