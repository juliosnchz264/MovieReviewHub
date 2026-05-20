"use client";

import Link from "next/link";
import Image from "next/image";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Navbar } from "@/components/navbar";
import { useSeriesItem, useSimilarSeries } from "@/features/series/hooks/useSeries";
import {
  useCreateSeriesReview,
  useMySeriesReview,
  useSeriesRatingStats,
} from "@/features/series/hooks/useSeriesReviews";
import { MediaFavoriteButton } from "@/features/cards/components/MediaFavoriteButton";
import { MyRatingDisplay } from "@/features/cards/components/MyRatingDisplay";
import { AddToListPopover } from "@/features/lists/components/AddToListPopover";
import { ReviewSectionsBlock } from "@/features/reviews/components/ReviewSectionsBlock";
import { RatingStars } from "@/features/reviews/components/RatingStars";
import { ReviewForm } from "@/features/reviews/components/ReviewForm";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useTranslate } from "@/hooks/useTranslate";
import type { ApiError } from "@/types/auth";

export function SeriesDetailView({ seriesId }: { seriesId: number }) {
  const t = useTranslate();
  const validId = Number.isFinite(seriesId);

  const { data: series, isLoading, isError } = useSeriesItem(validId ? seriesId : null);
  const similar = useSimilarSeries(validId ? seriesId : null, 12);
  const { data: stats } = useSeriesRatingStats(seriesId);
  const { data: currentUser } = useCurrentUser();
  const { data: myReview } = useMySeriesReview(seriesId);
  const createReview = useCreateSeriesReview(seriesId);

  const userAlreadyReviewed = !!myReview;

  return (
    <>
      <Navbar />
      <main className="min-h-screen px-3 py-6 sm:px-4 sm:py-10">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <Link href="/series">
            <Button variant="outline" size="sm">
              {t("common.back")}
            </Button>
          </Link>

          {isLoading && (
            <div className="grid gap-5 sm:gap-6 md:grid-cols-[240px_1fr] lg:grid-cols-[300px_1fr]">
              <Skeleton className="mx-auto aspect-2/3 w-40 rounded-xl sm:w-52 md:mx-0 md:w-full" />
              <div className="space-y-3">
                <Skeleton className="h-9 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          )}
          {isError && <p className="text-destructive">{t("series.notFound")}</p>}

          {series && (
            <article className="grid gap-5 sm:gap-6 md:grid-cols-[240px_1fr] lg:grid-cols-[300px_1fr]">
              <div className="relative mx-auto aspect-2/3 w-40 overflow-hidden rounded-xl border border-border bg-muted sm:w-52 md:mx-0 md:w-full">
                {series.imageUrl ? (
                  <Image
                    src={series.imageUrl}
                    alt={series.title}
                    fill
                    sizes="(max-width: 768px) 50vw, 300px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    No image
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    {series.title}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {series.genres && series.genres.length > 0
                      ? series.genres.map((g) => t(`genres.${g}`)).join(", ")
                      : "—"}
                    {series.firstAirDate ? ` • ${series.firstAirDate}` : ""}
                    {series.lastAirDate && series.lastAirDate !== series.firstAirDate
                      ? ` → ${series.lastAirDate}`
                      : ""}
                  </p>
                </div>

                {(series.numberOfSeasons || series.numberOfEpisodes) && (
                  <div className="flex gap-4 rounded-md border border-border bg-card p-3 text-sm">
                    {series.numberOfSeasons != null && (
                      <span>
                        <span className="font-medium">{series.numberOfSeasons}</span>
                        <span className="ml-1 text-muted-foreground">{t("series.seasons")}</span>
                      </span>
                    )}
                    {series.numberOfEpisodes != null && (
                      <span>
                        <span className="font-medium">{series.numberOfEpisodes}</span>
                        <span className="ml-1 text-muted-foreground">{t("series.episodes")}</span>
                      </span>
                    )}
                  </div>
                )}

                {stats && stats.count > 0 && (
                  <div className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
                    <RatingStars value={stats.average} readOnly />
                    <span className="text-sm font-medium">{stats.average.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">
                      ({t(stats.count === 1 ? "movieDetail.ratingCountOne" : "movieDetail.ratingCountMany", { n: stats.count })})
                    </span>
                  </div>
                )}

                {series.description && (
                  <p className="leading-relaxed text-foreground/80">{series.description}</p>
                )}

                <MyRatingDisplay kind="SERIES" targetId={series.id} variant="panel" />

                <div className="flex flex-wrap gap-2">
                  <MediaFavoriteButton kind="SERIES" targetId={series.id} />
                  <AddToListPopover kind="SERIES" targetId={series.id} />
                </div>
              </div>
            </article>
          )}

          {validId && (
            <section className="space-y-4 pt-6">
              <h2 className="text-xl font-semibold">{t("series.reviewsTitle")}</h2>

              {currentUser && !userAlreadyReviewed && (
                <ReviewForm
                  onSubmit={(payload) => createReview.mutate(payload)}
                  pending={createReview.isPending}
                  error={createReview.error as AxiosError<ApiError> | null}
                />
              )}

              {!currentUser && (
                <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                  <Link href="/login" className="text-primary hover:underline">
                    {t("movieDetail.signInPrefix")}
                  </Link>
                  {t("movieDetail.signInSuffix")}
                </div>
              )}

              <ReviewSectionsBlock kind="series" targetId={seriesId} />
            </section>
          )}

          {validId && series?.genres && series.genres.length > 0 && similar.data && similar.data.length > 0 && (
            <section className="space-y-3 pt-6">
              <h2 className="text-xl font-semibold">{t("series.similarTitle")}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {similar.data.map((s) => (
                  <Link
                    key={s.id}
                    href={`/series/${s.id}`}
                    className="group overflow-hidden rounded-xl border border-border/40 bg-card/40 transition hover:border-border hover:bg-card hover:shadow-md"
                  >
                    <div className="relative aspect-2/3 bg-muted/60">
                      {s.imageUrl && (
                        <Image
                          src={s.imageUrl}
                          alt={s.title}
                          fill
                          sizes="160px"
                          className="object-cover transition group-hover:scale-105"
                        />
                      )}
                    </div>
                    <div className="p-2">
                      <h3 className="line-clamp-1 text-xs font-medium">{s.title}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
