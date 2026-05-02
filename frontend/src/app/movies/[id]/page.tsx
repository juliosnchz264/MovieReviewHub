"use client";

import { use } from "react";
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
  useRatingStats,
} from "@/features/reviews/hooks/useReviews";
import { RatingStars } from "@/features/reviews/components/RatingStars";
import { ReviewForm } from "@/features/reviews/components/ReviewForm";
import { ReviewList } from "@/features/reviews/components/ReviewList";
import { MovieRow } from "@/features/movies/components/MovieRow";
import { FavoriteButton } from "@/features/favorites/components/FavoriteButton";
import type { ApiError } from "@/types/auth";

export default function MovieDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const movieId = Number(id);
  const validId = Number.isFinite(movieId);

  const { data: movie, isLoading, isError } = useMovie(validId ? movieId : null);
  const { data: stats } = useRatingStats(movieId);
  const { data: reviewsPage } = useMovieReviews(movieId);
  const { data: currentUser } = useCurrentUser();
  const createReview = useCreateReview(movieId);
  const similar = useSimilar(validId ? movieId : null, 12);

  const reviews = reviewsPage?.content ?? [];
  const userAlreadyReviewed = reviews.some((r) => r.userId === currentUser?.id);

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <Link href="/movies">
          <Button variant="outline" size="sm">
            ← Back
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
        {isError && <p className="text-destructive">Movie not found</p>}

        {movie && (
          <article className="grid gap-6 md:grid-cols-[300px_1fr]">
            <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-border bg-muted">
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
                  {movie.genre ?? "—"}
                  {movie.releaseDate ? ` • ${movie.releaseDate}` : ""}
                </p>
              </div>

              {stats && stats.count > 0 && (
                <div className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
                  <RatingStars value={stats.average} readOnly />
                  <span className="text-sm font-medium">{stats.average.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">
                    ({stats.count} {stats.count === 1 ? "review" : "reviews"})
                  </span>
                </div>
              )}

              {movie.description && (
                <p className="leading-relaxed text-foreground/80">{movie.description}</p>
              )}

              <div className="flex gap-2">
                <FavoriteButton movieId={movie.id} />
              </div>
            </div>
          </article>
        )}

        {validId && (
          <section className="space-y-4 pt-6">
            <h2 className="text-xl font-semibold">Reviews</h2>

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
                  Sign in
                </Link>{" "}
                to write a review.
              </div>
            )}

            <ReviewList reviews={reviews} movieId={movieId} />
          </section>
        )}

        {validId && movie?.genre && (
          <div className="pt-6">
            <MovieRow
              title="More like this"
              subtitle={`Other ${movie.genre} movies`}
              movies={similar.data}
              isLoading={similar.isLoading}
              emptyText={`No other ${movie.genre} movies in the catalog yet.`}
            />
          </div>
        )}
      </div>
    </main>
  );
}
