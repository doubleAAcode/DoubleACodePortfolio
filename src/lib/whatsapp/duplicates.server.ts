import "@tanstack/react-start/server-only";

const MESSAGE_TTL_MS = 10 * 60 * 1000;
const processedMessageIds = new Map<string, number>();

export function hasProcessedWhatsAppMessage(messageId: string, now = Date.now()) {
  pruneProcessedMessageIds(now);

  if (processedMessageIds.has(messageId)) {
    return true;
  }

  processedMessageIds.set(messageId, now + MESSAGE_TTL_MS);
  return false;
}

function pruneProcessedMessageIds(now: number) {
  for (const [messageId, expiresAt] of processedMessageIds.entries()) {
    if (expiresAt <= now) {
      processedMessageIds.delete(messageId);
    }
  }
}
