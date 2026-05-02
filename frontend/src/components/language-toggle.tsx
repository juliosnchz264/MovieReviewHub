"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocaleStore } from "@/store/locale";

export function LanguageToggle() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLocale(locale === "es" ? "en" : "es")}
      aria-label="Toggle language"
      className="gap-1.5"
    >
      <Languages className="size-4" />
      <span className="text-xs font-medium uppercase tracking-wide">
        {locale}
      </span>
    </Button>
  );
}
