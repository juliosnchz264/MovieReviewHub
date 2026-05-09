"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { CardActionsMenu } from "@/features/cards/components/CardActionsMenu";
import { useInfiniteSeries } from "@/features/series/hooks/useSeries";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useIntersection } from "@/hooks/useIntersection";
import { useTranslate } from "@/hooks/useTranslate";

const GENRES = [
  // TMDB TV-specific genre list (different from movies)
  "",
  "Action & Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Kids",
  "Mystery",
  "News",
  "Reality",
  "Sci-Fi & Fantasy",
  "Soap",
  "Talk",
  "War & Politics",
  "Western",
];

export default function SeriesPage() {
  const t = useTranslate();
  const [titleInput, setTitleInput] = useState("");
  const [genre, setGenre] = useState("");
  const debouncedTitle = useDebouncedValue(titleInput, 350);

  const filters = useMemo(
    () => ({
      title: debouncedTitle || undefined,
      genre: genre || undefined,
    }),
    [debouncedTitle, genre]
  );

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteSeries(filters);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersection(sentinelRef, { rootMargin: "300px" });

  useEffect(() => {
    if (isVisible && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isVisible, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const items = data?.pages.flatMap((p) => p.content) ?? [];
  const totalElements = data?.pages[0]?.totalElements ?? 0;

  return (
    <>
      <Navbar />
      <main className="min-h-screen px-4 py-8 sm:py-12">
        <div className="mx-auto w-full max-w-7xl space-y-6">
          <h1 className="text-3xl font-semibold tracking-tight">{t("nav.series")}</h1>

          <div className="flex flex-wrap gap-3">
            <input
              type="search"
              placeholder={t("movies.searchPlaceholder")}
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              className="min-w-[200px] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            >
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g ? t(`genres.${g}`) : t("movies.allGenres")}
                </option>
              ))}
            </select>
          </div>

          {!isLoading && (
            <p className="text-sm text-muted-foreground">
              {t(totalElements === 1 ? "series.countOne" : "series.countMany", {
                n: totalElements,
              })}
            </p>
          )}

          {isLoading && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
                  <Skeleton className="aspect-2/3 w-full rounded-none" />
                  <div className="space-y-2 p-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {isError && <p className="text-destructive">{t("series.failedToLoad")}</p>}

          {!isLoading && items.length === 0 && (
            <p className="py-12 text-center text-muted-foreground">{t("series.empty")}</p>
          )}

          {items.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((s) => (
                <div
                  key={s.id}
                  className="group relative overflow-hidden rounded-xl border border-border bg-card transition hover:shadow-md"
                >
                  <div className="absolute right-2 top-2 z-10">
                    <CardActionsMenu kind="SERIES" targetId={s.id} />
                  </div>
                  <Link href={`/series/${s.id}`} className="block">
                    <div className="relative aspect-2/3 bg-muted">
                      {s.imageUrl ? (
                        <Image
                          src={s.imageUrl}
                          alt={s.title}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover transition group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="line-clamp-1 text-sm font-medium">{s.title}</h3>
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {s.genres && s.genres.length > 0
                          ? s.genres.map((g) => t(`genres.${g}`)).join(", ")
                          : "—"}
                        {s.firstAirDate ? ` • ${s.firstAirDate.slice(0, 4)}` : ""}
                        {s.numberOfSeasons ? ` • ${s.numberOfSeasons}S` : ""}
                      </p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}

          <div ref={sentinelRef} className="h-10" />

          {isFetchingNextPage && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-2/3 rounded-xl" />
              ))}
            </div>
          )}

          {!hasNextPage && items.length > 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              {t("movies.endOfCatalog")}
            </p>
          )}
        </div>
      </main>
    </>
  );
}
