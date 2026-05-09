"use client";

import { Film, Star, Tv } from "lucide-react";
import type { PublicProfile } from "@/types/user";

interface Props {
  profile: PublicProfile;
}

export function ProfileStats({ profile }: Props) {
  const stats = [
    {
      icon: Film,
      label: "Promedio películas",
      value: formatScore(profile.averageMovieScore),
      sub: pluralReviews(profile.totalMovieReviews),
    },
    {
      icon: Tv,
      label: "Promedio series",
      value: formatScore(profile.averageTvScore),
      sub: pluralReviews(profile.totalTvReviews),
    },
    {
      icon: Star,
      label: "Listas públicas",
      value: profile.totalPublicLists.toString(),
      sub: profile.totalPublicLists === 1 ? "lista" : "listas",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-4 py-3"
        >
          <s.icon className="size-5 text-muted-foreground" aria-hidden />
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {s.label}
            </span>
            <span className="text-lg font-semibold leading-tight">{s.value}</span>
            <span className="text-xs text-muted-foreground">{s.sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatScore(score: number | null): string {
  if (score === null) return "—";
  return `${score.toFixed(1)} / 5`;
}

function pluralReviews(n: number): string {
  return n === 1 ? "1 reseña" : `${n} reseñas`;
}
