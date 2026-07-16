import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

const KEY = "wa-admin-lang";

export function LanguageSwitcher() {
  const [lang, setLang] = useState<"en" | "ar">("en");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && (localStorage.getItem(KEY) as "en" | "ar" | null)) || "en";
    setLang(saved);
    applyLang(saved);
  }, []);

  const toggle = () => {
    const next = lang === "en" ? "ar" : "en";
    setLang(next);
    localStorage.setItem(KEY, next);
    applyLang(next);
  };

  return (
    <Button variant="ghost" size="sm" onClick={toggle} className="gap-1.5" aria-label="Toggle language">
      <Languages className="h-4 w-4" />
      <span className="text-xs font-medium">{lang === "en" ? "EN" : "AR"}</span>
    </Button>
  );
}

function applyLang(l: "en" | "ar") {
  if (typeof document === "undefined") return;
  document.documentElement.lang = l;
  document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
}
