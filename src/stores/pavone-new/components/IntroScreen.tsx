import { useEffect, useState } from "react";
import { STORE_NAME, WHITE_LOGO_URL } from "@/stores/pavone-new/lib/brand";

let hasPlayedThisLoad = false;

export function IntroScreen() {
  const [phase, setPhase] = useState<"hidden" | "showing" | "leaving">("hidden");

  useEffect(() => {
    if (hasPlayedThisLoad) return;
    hasPlayedThisLoad = true;

    setPhase("showing");
    document.body.style.overflow = "hidden";

    const leaveTimer = setTimeout(() => setPhase("leaving"), 1800);
    const doneTimer = setTimeout(() => {
      setPhase("hidden");
      document.body.style.overflow = "";
    }, 2500);

    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(doneTimer);
      document.body.style.overflow = "";
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-white ${
        phase === "leaving" ? "animate-intro-out" : ""
      }`}
      aria-hidden="true"
    >
      <img
        src={WHITE_LOGO_URL}
        alt={STORE_NAME}
        className={`w-64 max-w-[70vw] sm:w-80 ${
          phase === "leaving"
            ? "transition-transform duration-700 ease-out -translate-y-6"
            : "animate-intro-logo"
        }`}
      />
    </div>
  );
}
