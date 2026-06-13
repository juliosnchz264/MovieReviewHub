"use client";

import { useMovieCast, useSeriesCast } from "@/features/cast/hooks/useCast";
import { CastCard } from "@/features/cast/components/CastCard";
import { useTranslate } from "@/hooks/useTranslate";
import type { MediaKind } from "@/types/cast";

interface Props {
  kind: MediaKind;
  id: number;
  limit?: number;
}

/**
 * Top-billed cast strip used on movie/series detail pages.
 *
 * - Renders nothing when TMDB returns an empty cast (e.g., the title was
 *   imported but has no credits yet, or the upstream call failed). The
 *   detail page stays clean instead of showing an empty heading.
 * - Horizontal scroll with snap so mobile can scrub without overflowing
 *   layout; cards are touch-target sized at every breakpoint.
 */
export function CastRow({ kind, id, limit = 10 }: Props) {
  const t = useTranslate();
  const movieQuery = useMovieCast(kind === "movie" ? id : undefined, limit);
  const seriesQuery = useSeriesCast(kind === "series" ? id : undefined, limit);
  const query = kind === "movie" ? movieQuery : seriesQuery;

  if (query.isLoading) {
    return (
      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">
          {t("cast.title")}
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="w-28 shrink-0 sm:w-32 md:w-36"
              aria-hidden
            >
              <div className="aspect-2/3 animate-pulse rounded-xl bg-muted" />
              <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-muted" />
              <div className="mt-1 h-3 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const cast = query.data ?? [];
  if (cast.length === 0) return null;

  return (
    <section aria-labelledby="cast-heading" className="space-y-3">
      <h2 id="cast-heading" className="text-xl font-semibold tracking-tight">
        {t("cast.title")}
      </h2>
      <ul
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
        aria-label={t("cast.title")}
      >
        {cast.map((member) => (
          <li key={member.tmdbPersonId}>
            <CastCard member={member} />
          </li>
        ))}
      </ul>
    </section>
  );
}
