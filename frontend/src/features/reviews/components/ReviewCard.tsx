"use client";

import Link from "next/link";
import { Heart, MessageSquare } from "lucide-react";
import { RatingStars } from "@/features/reviews/components/RatingStars";
import { UserAvatar } from "@/features/reviews/components/UserAvatar";
import { ReviewLikeButton } from "@/features/reviews/components/ReviewLikeButton";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
import type { ReviewCard as ReviewCardData, ReviewKind } from "@/types/review";

interface Props {
  review: ReviewCardData;
  kind: ReviewKind;
  variant?: "compact" | "full";
}

function reviewDetailHref(kind: ReviewKind, id: number): string {
  return kind === "movie" ? `/reviews/${id}` : `/series-reviews/${id}`;
}

export function ReviewCard({ review, kind, variant = "compact" }: Props) {
  const t = useTranslate();
  const { data: currentUser } = useCurrentUser();
  const isOwn = currentUser?.id === review.userId;
  const detailHref = reviewDetailHref(kind, review.id);
  const profileHref = `/users/${review.userId}`;

  return (
    <article
      className={cn(
        "group/card rounded-2xl border border-border bg-card/50 p-5 transition-colors",
        "hover:bg-card hover:border-border/80"
      )}
    >
      <header className="flex items-start gap-3">
        <Link
          href={profileHref}
          aria-label={t("reviews.viewProfile", { name: review.username })}
          className="shrink-0"
        >
          <UserAvatar url={review.userAvatarUrl} name={review.username} size={44} />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href={detailHref}
              className="text-sm font-medium hover:underline focus-visible:underline focus-visible:outline-none"
            >
              {t("reviews.reviewBy")}{" "}
              <span className="text-foreground">{review.username}</span>
            </Link>
            {review.authorFavorited && (
              <span
                className="inline-flex items-center"
                title={t("reviews.markedAsFavorite")}
                aria-label={t("reviews.markedAsFavorite")}
              >
                <Heart className="size-3.5 fill-rose-500 text-rose-500" />
              </span>
            )}
          </div>
          <div className="mt-1">
            <RatingStars value={review.rating} readOnly size="sm" />
          </div>
        </div>
      </header>

      {review.comment && (
        <Link
          href={detailHref}
          className="mt-3 block focus-visible:outline-none"
          aria-label={t("reviews.openReview")}
        >
          <p
            className={cn(
              "text-sm leading-relaxed text-foreground/80",
              variant === "compact" && "line-clamp-3"
            )}
          >
            {review.comment}
          </p>
        </Link>
      )}

      <footer className="mt-4 flex items-center gap-4 border-t border-border/60 pt-3">
        <ReviewLikeButton
          kind={kind}
          reviewId={review.id}
          liked={review.likedByMe}
          likeCount={review.likeCount}
          ownReview={isOwn}
        />
        <Link
          href={detailHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-label={t("reviews.openReplies")}
        >
          <MessageSquare className="size-[18px]" />
          <span className="font-medium">
            {t(
              review.replyCount === 1 ? "reviews.repliesOne" : "reviews.repliesMany",
              { n: review.replyCount }
            )}
          </span>
        </Link>
      </footer>
    </article>
  );
}
