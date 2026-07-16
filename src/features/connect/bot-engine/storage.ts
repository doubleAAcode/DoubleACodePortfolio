import { seedStoreBotState } from "./seed";
import type { StoreBotState } from "./types";

const STORAGE_KEY = "aa_store_bot_sandbox_v1";

let memoryState = cloneState(seedStoreBotState);

function cloneState(state: StoreBotState): StoreBotState {
  return JSON.parse(JSON.stringify(state)) as StoreBotState;
}

export function getStoreBotState(): StoreBotState {
  if (typeof window === "undefined") return cloneState(memoryState);

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = cloneState(seedStoreBotState);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as StoreBotState;
  } catch {
    return cloneState(memoryState);
  }
}

export function setStoreBotState(nextState: StoreBotState) {
  memoryState = cloneState(nextState);
  if (typeof window === "undefined") return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  window.dispatchEvent(new CustomEvent("store-bot-state-change"));
}

export function resetStoreBotState() {
  setStoreBotState(cloneState(seedStoreBotState));
}

export function updateStoreBotState(updater: (state: StoreBotState) => StoreBotState) {
  const nextState = updater(getStoreBotState());
  setStoreBotState(nextState);
  return nextState;
}

export function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
