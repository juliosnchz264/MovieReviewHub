"use client";

import Link from "next/link";
import Image from "next/image";
import { Trophy, RefreshCw } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { awards, type AwardEntry } from "@/features/awards/data";
import { useAwardCatalog } from "@/features/awards/hooks/useAwardCatalog";
import { useAwardSync } from "@/features/awards/hooks/useAwardSync";
import { useTranslate } from "@/hooks/useTranslate";
import { useAuthStore } from "@/store/auth";

export default function AwardsPage() {
  const t = useTranslate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "ROLE_ADMIN";

  const movieTmdbIds = awards.filter((a) => a.winner.mediaType === "movie").map((a) => a.winner.tmdbId);
  const seriesTmdbIds = awards.filter((a) => a.winner.mediaType === "tv").map((a) => a.winner.tmdbId);

  const { data } = useAwardCatalog(movieTmdbIds, seriesTmdbIds);
  const sync = useAwardSync();

  const byYear = [...awards]
    .sort((a, b) => b.year - a.year)
    .reduce<Record<number, AwardEntry[]>>((acc, entry) => {
      (acc[entry.year] ??= []).push(entry);
      return acc;
    }, {});

  const years = Object.keys(byYear)
    .map(Number)
    .sort((a, b) => b - a);

  function handleSync() {
    sync.mutate(
      awards.map((a) => ({ tmdbId: a.winner.tmdbId, mediaType: a.winner.mediaType }))
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen px-3 py-6 sm:px-4 sm:py-12">
        <div className="mx-auto w-full max-w-7xl space-y-6 sm:space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground sm:size-12">
                <Trophy className="size-5 sm:size-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {t("nav.awards")}
                </h1>
                <p className="text-sm text-muted-foreground">{t("awards.subtitle")}</p>
              </div>
            </div>
            {isAdmin && (
              <Button
                onClick={handleSync}
                disabled={sync.isPending}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={sync.isPending ? "size-4 animate-spin" : "size-4"} />
                {sync.isPending ? t("awards.syncing") : t("awards.sync")}
              </Button>
            )}
          </div>

          {sync.isSuccess && sync.data && (
            <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
              {t("awards.syncDone", {
                imported:
                  sync.data.imported.movies + sync.data.imported.series,
                skipped:
                  sync.data.skipped.movies + sync.data.skipped.series,
                failed: sync.data.failed.length,
              })}
            </p>
          )}
          {sync.isError && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {t("awards.syncFailed")}
            </p>
          )}

          <div className="space-y-10">
            {years.map((year) => (
              <section key={year} className="space-y-4">
                <h2 className="text-xl font-medium">{year}</h2>
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                  {(byYear[year] ?? []).map((entry) => {
                    const isMovie = entry.winner.mediaType === "movie";
                    const tmdbKey = String(entry.winner.tmdbId);
                    return (
                      <AwardCard
                        key={`${entry.ceremony}-${entry.category}-${entry.year}`}
                        entry={entry}
                        catalogId={
                          isMovie
                            ? data?.catalog.movies[tmdbKey]
                            : data?.catalog.series[tmdbKey]
                        }
                        posterUrl={
                          isMovie
                            ? data?.posters.movies[tmdbKey]
                            : data?.posters.tv[tmdbKey]
                        }
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

function AwardCard({
  entry,
  catalogId,
  posterUrl,
}: {
  entry: AwardEntry;
  catalogId: number | undefined;
  posterUrl: string | undefined;
}) {
  const t = useTranslate();

  const internalHref =
    catalogId !== undefined
      ? entry.winner.mediaType === "movie"
        ? `/movies/${catalogId}`
        : `/series/${catalogId}`
      : null;

  const cardInner = (
    <>
      <div className="relative aspect-2/3 bg-muted">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={entry.winner.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Trophy className="size-10" />
          </div>
        )}
        <div className="absolute right-2 top-2 rounded-full bg-background/90 px-2 py-1 text-[11px] font-medium tracking-wide backdrop-blur">
          {entry.ceremony}
        </div>
      </div>
      <div className="space-y-1 p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {entry.category}
        </p>
        <h3 className="line-clamp-1 text-base font-medium">{entry.winner.title}</h3>
        <p className="text-xs text-muted-foreground">
          {internalHref ? t("awards.inCatalog") : t("awards.pendingSync")}
        </p>
      </div>
    </>
  );

  const wrapperCls =
    "group block overflow-hidden rounded-xl border border-border bg-card transition hover:shadow-md";

  if (internalHref) {
    return (
      <Link href={internalHref} className={wrapperCls}>
        {cardInner}
      </Link>
    );
  }

  return (
    <div className={`${wrapperCls} cursor-not-allowed opacity-70`}>
      {cardInner}
    </div>
  );
}
