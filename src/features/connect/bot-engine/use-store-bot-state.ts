import { useCallback, useEffect, useState } from "react";
import { getStoreBotState, resetStoreBotState, setStoreBotState } from "./storage";
import type { StoreBotState } from "./types";

export function useStoreBotState() {
  const [state, setState] = useState<StoreBotState>(() => getStoreBotState());

  useEffect(() => {
    const sync = () => setState(getStoreBotState());
    window.addEventListener("storage", sync);
    window.addEventListener("store-bot-state-change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("store-bot-state-change", sync);
    };
  }, []);

  const save = useCallback((nextState: StoreBotState) => {
    setStoreBotState(nextState);
    setState(nextState);
  }, []);

  const reset = useCallback(() => {
    resetStoreBotState();
    setState(getStoreBotState());
  }, []);

  return { state, save, reset };
}
