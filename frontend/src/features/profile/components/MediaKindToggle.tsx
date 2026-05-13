"use client";

import { Film, Tv } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/hooks/useTranslate";

export type MediaKind = "movie" | "series";

interface Props {
  value: MediaKind;
  onChange: (k: MediaKind) => void;
  movieCount?: number;
  seriesCount?: number;
  className?: string;
}

/**
 * Movies | TV segmented control with animated underline and counters.
 * Tab semantics (role="tab" / aria-selected) — assumes parent provides
 * a region with role="tablist" if needed for screen readers, or wraps
 * with one. Keep it lightweight: parent owns the active state.
 */
export function MediaKindToggle({
  value,
  onChange,
  movieCount,
  seriesCount,
  className,
}: Props) {
  const t = useTranslate();

  const items: { key: MediaKind; label: string; count?: number; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "movie", label: t("kindToggle.movies"), count: movieCount, icon: Film },
    { key: "series", label: t("kindToggle.tv"), count: seriesCount, icon: Tv },
  ];

  return (
    <div
      role="tablist"
      aria-label={t("kindToggle.aria")}
      className={cn("relative inline-flex items-center gap-1 rounded-full border border-border bg-card p-1", className)}
    >
      {items.map((it) => {
        const isActive = it.key === value;
        const Icon = it.icon;
        return (
          <button
            key={it.key}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(it.key)}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            <span>{it.label}</span>
            {it.count !== undefined && (
              <span
                className={cn(
                  "ml-1 rounded-full px-1.5 py-0 text-[10px] tabular-nums",
                  isActive
                    ? "bg-primary-foreground/15 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {it.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
