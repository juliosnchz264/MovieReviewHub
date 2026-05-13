"use client";

import { Film, Star, Tv } from "lucide-react";
import { useTranslate } from "@/hooks/useTranslate";
import type { PublicProfile } from "@/types/user";

interface Props {
  profile: PublicProfile;
}

export function ProfileStats({ profile }: Props) {
  const t = useTranslate();
  const stats = [
    {
      icon: Film,
      label: t("profile.averageMovies"),
      value: formatScore(profile.averageMovieScore),
      sub: pluralReviews(profile.totalMovieReviews, t),
    },
    {
      icon: Tv,
      label: t("profile.averageSeries"),
      value: formatScore(profile.averageTvScore),
      sub: pluralReviews(profile.totalTvReviews, t),
    },
    {
      icon: Star,
      label: t("profile.publicLists"),
      value: profile.totalPublicLists.toString(),
      sub: "",
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
            {s.sub && <span className="text-xs text-muted-foreground">{s.sub}</span>}
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

function pluralReviews(n: number, t: (k: string, v?: Record<string, string | number>) => string): string {
  if (n === 1) return t("movieDetail.ratingCountOne", { n });
  return t("movieDetail.ratingCountMany", { n });
}
