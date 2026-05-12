"use client";

import Link from "next/link";
import Image from "next/image";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMovie } from "@/features/movies/hooks/useMovie";
import { useSimilar } from "@/features/movies/hooks/useDiscover";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import {
  useCreateReview,
  useMovieReviews,
  useMyMovieReview,
  useRatingStats,
} from "@/features/reviews/hooks/useReviews";
import { RatingStars } from "@/features/reviews/components/RatingStars";
import { ReviewForm } from "@/features/reviews/components/ReviewForm";
import { ReviewList } from "@/features/reviews/components/ReviewList";
import { MovieRow } from "@/features/movies/components/MovieRow";
import { MediaFavoriteButton } from "@/features/cards/components/MediaFavoriteButton";
import { MyRatingDisplay } from "@/features/cards/components/MyRatingDisplay";
import { AddToListPopover } from "@/features/lists/components/AddToListPopover";
import { Navbar } from "@/components/navbar";
import { useTranslate } from "@/hooks/useTranslate";
import type { ApiError } from "@/types/auth";

export function MovieDetailView({ movieId }: { movieId: number }) {
  const t = useTranslate();
  const validId = Number.isFinite(movieId);

  const { data: movie, isLoading, isError } = useMovie(validId ? movieId : null);
  const { data: stats } = useRatingStats(movieId);
  const { data: reviewsPage } = useMovieReviews(movieId);
  const { data: currentUser } = useCurrentUser();
  const { data: myReview } = useMyMovieReview(movieId);
  const createReview = useCreateReview(movieId);
  const similar = useSimilar(validId ? movieId : null, 12);

  const reviews = reviewsPage?.content ?? [];
  const userAlreadyReviewed = !!myReview;

  return (
    <>
      <Navbar />
      <main className="min-h-screen px-4 py-10">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <Link href="/movies">
            <Button variant="outline" size="sm">
              {t("common.back")}
            </Button>
          </Link>

        {isLoading && (
          <div className="grid gap-6 md:grid-cols-[300px_1fr]">
            <Skeleton className="aspect-2/3 rounded-xl" />
            <div className="space-y-3">
              <Skeleton className="h-9 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-40" />
            </div>
          </div>
        )}
        {isError && <p className="text-destructive">{t("movieDetail.notFound")}</p>}

        {movie && (
          <article className="grid gap-6 md:grid-cols-[300px_1fr]">
            <div className="relative aspect-2/3 overflow-hidden rounded-xl border border-border bg-muted">
              {movie.imageUrl ? (
                <Image
                  src={movie.imageUrl}
                  alt={movie.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 300px"
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
                <h1 className="text-3xl font-semibold tracking-tight">{movie.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {movie.genres && movie.genres.length > 0
                    ? movie.genres.map((g) => t(`genres.${g}`)).join(", ")
                    : "—"}
                  {movie.releaseDate ? ` • ${movie.releaseDate}` : ""}
                </p>
              </div>

              {stats && stats.count > 0 && (
                <div className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
                  <RatingStars value={stats.average} readOnly />
                  <span className="text-sm font-medium">{stats.average.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">
                    ({t(stats.count === 1 ? "movieDetail.ratingCountOne" : "movieDetail.ratingCountMany", { n: stats.count })})
                  </span>
                </div>
              )}

              {movie.description && (
                <p className="leading-relaxed text-foreground/80">{movie.description}</p>
              )}

              <MyRatingDisplay kind="MOVIE" targetId={movie.id} variant="panel" />

              <div className="flex flex-wrap gap-2">
                <MediaFavoriteButton kind="MOVIE" targetId={movie.id} />
                <AddToListPopover kind="MOVIE" targetId={movie.id} />
              </div>
            </div>
          </article>
        )}

        {validId && (
          <section className="space-y-4 pt-6">
            <h2 className="text-xl font-semibold">{t("movieDetail.reviewsTitle")}</h2>

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

            <ReviewList reviews={reviews} movieId={movieId} />
          </section>
        )}

        {validId && movie?.genres && movie.genres.length > 0 && (
          <div className="pt-6">
            <MovieRow
              title={t("movieDetail.similarTitle")}
              subtitle={t("movieDetail.similarSubtitle", {
                genre: movie.genres.map((g) => t(`genres.${g}`)).join(", "),
              })}
              movies={similar.data}
              isLoading={similar.isLoading}
              emptyText={t("movieDetail.similarEmpty", {
                genre: movie.genres.map((g) => t(`genres.${g}`)).join(", "),
              })}
            />
          </div>
        )}
        </div>
      </main>
    </>
  );
}
