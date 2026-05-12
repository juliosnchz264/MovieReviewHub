"use client";

import { Star } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useTranslate } from "@/hooks/useTranslate";
import { RatingStars } from "@/features/reviews/components/RatingStars";
import { useMyMovieReview } from "@/features/reviews/hooks/useReviews";
import { useMySeriesReview } from "@/features/series/hooks/useSeriesReviews";
import { cn } from "@/lib/utils";
import type { ListItemKind } from "@/types/list";

interface Props {
  kind: ListItemKind;
  targetId: number;
  variant?: "badge" | "panel";
  className?: string;
}

export function MyRatingDisplay({ kind, targetId, variant = "badge", className }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) return null;
  return kind === "MOVIE" ? (
    <MovieMyRating movieId={targetId} variant={variant} className={className} />
  ) : (
    <SeriesMyRating seriesId={targetId} variant={variant} className={className} />
  );
}

function MovieMyRating({
  movieId,
  variant,
  className,
}: {
  movieId: number;
  variant: "badge" | "panel";
  className?: string;
}) {
  const { data: myReview } = useMyMovieReview(movieId);
  if (!myReview) return null;
  return <View rating={myReview.rating} variant={variant} className={className} />;
}

function SeriesMyRating({
  seriesId,
  variant,
  className,
}: {
  seriesId: number;
  variant: "badge" | "panel";
  className?: string;
}) {
  const { data: myReview } = useMySeriesReview(seriesId);
  if (!myReview) return null;
  return <View rating={myReview.rating} variant={variant} className={className} />;
}

function View({
  rating,
  variant,
  className,
}: {
  rating: number;
  variant: "badge" | "panel";
  className?: string;
}) {
  const t = useTranslate();
  const { data: currentUser } = useCurrentUser();

  if (variant === "badge") {
    return (
      <div
        className={cn(
          "flex items-center gap-1 rounded-full bg-yellow-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-black shadow",
          className
        )}
        aria-label={t("actions.myRating")}
      >
        <Star className="size-3 fill-current" />
        <span>{rating.toFixed(1)}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border border-border bg-card p-3",
        className
      )}
    >
      <Star className="size-4 fill-yellow-500 text-yellow-500" />
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{t("actions.myRating")}</span>
        {currentUser?.username && (
          <span className="text-sm font-medium">{currentUser.username}</span>
        )}
      </div>
      <RatingStars value={rating} readOnly />
      <span className="text-sm font-medium">{rating.toFixed(1)}</span>
    </div>
  );
}
