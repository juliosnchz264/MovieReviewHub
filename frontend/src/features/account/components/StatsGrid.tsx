"use client";

import { Heart, MessageSquare, CalendarDays } from "lucide-react";
import { useAccountStats } from "@/features/account/hooks/useAccountStats";
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

export function StatsGrid() {
  const { data, isLoading } = useAccountStats();

  const items = [
    {
      label: "Reseñas escritas",
      value: data?.totalReviews ?? 0,
      icon: MessageSquare,
    },
    {
      label: "Favoritos",
      value: data?.totalFavorites ?? 0,
      icon: Heart,
    },
    {
      label: "Miembro desde",
      value: formatDate(data?.memberSince),
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
