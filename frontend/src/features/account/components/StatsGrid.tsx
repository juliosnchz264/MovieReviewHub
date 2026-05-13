"use client";

import { Heart, MessageSquare, CalendarDays } from "lucide-react";
import { useAccountStats } from "@/features/account/hooks/useAccountStats";
import { useLocaleStore } from "@/store/locale";
import { useTranslate } from "@/hooks/useTranslate";
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(iso: string | undefined, locale: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

export function StatsGrid() {
  const t = useTranslate();
  const locale = useLocaleStore((s) => s.locale);
  const { data, isLoading } = useAccountStats();

  const items = [
    {
      label: t("accountStats.reviewsLabel"),
      value: data?.totalReviews ?? 0,
      icon: MessageSquare,
    },
    {
      label: t("accountStats.favoritesLabel"),
      value: data?.totalFavorites ?? 0,
      icon: Heart,
    },
    {
      label: t("accountStats.memberSinceLabel"),
      value: formatDate(data?.memberSince, locale),
      icon: CalendarDays,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-xl border border-border bg-card p-4"
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <it.icon className="size-3.5" aria-hidden />
            <span>{it.label}</span>
          </div>
          <div className="mt-1.5 text-xl font-semibold">
            {isLoading ? <Skeleton className="h-7 w-16" /> : it.value}
          </div>
        </div>
      ))}
    </div>
  );
}
