"use client";

import { Clapperboard } from "lucide-react";
import { useTranslate } from "@/hooks/useTranslate";

export function AuthHero() {
  const t = useTranslate();

  return (
    <aside
      aria-hidden="true"
      className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-background" />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10 px-10 pt-10">
        <div className="flex items-center gap-2 text-foreground">
          <Clapperboard className="size-6" />
          <span className="text-base font-semibold tracking-tight">
            MovieReviewHub
          </span>
        </div>
      </div>

      <div className="relative z-10 px-10 pb-12">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {t("auth.heroTagline")}
        </p>
        <h2 className="mt-4 max-w-md text-3xl font-semibold leading-tight tracking-tight text-foreground">
          {t("auth.heroDesc")}
        </h2>
      </div>
    </aside>
  );
}
