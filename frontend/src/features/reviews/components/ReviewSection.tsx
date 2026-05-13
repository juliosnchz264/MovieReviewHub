"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ReviewCard } from "@/features/reviews/components/ReviewCard";
import { ReviewCardSkeleton } from "@/features/reviews/components/ReviewCardSkeleton";
import { useReviewSection } from "@/features/reviews/hooks/useReviewSocial";
import { useTranslate } from "@/hooks/useTranslate";
import type { ReviewKind, ReviewSort } from "@/types/review";

interface Props {
  kind: ReviewKind;
  targetId: number;
  sort: ReviewSort;
  limit?: number;
}

function feedHref(kind: ReviewKind, targetId: number, sort: ReviewSort): string {
  const path = kind === "movie" ? "movies" : "series";
  return `/${path}/${targetId}/reviews?sort=${sort}`;
}

export function ReviewSection({ kind, targetId, sort, limit = 3 }: Props) {
  const t = useTranslate();
  const { data, isLoading } = useReviewSection(kind, targetId, sort, limit);

  const titleKey = sort === "popular" ? "reviews.popular" : "reviews.recent";
  const emptyKey = sort === "popular" ? "reviews.emptyPopular" : "reviews.emptyRecent";
  const reviews = data ?? [];
  const hasReviews = reviews.length > 0;

  return (
    <section aria-labelledby={`reviews-${sort}-heading`}>
      <header className="mb-4 flex items-baseline justify-between gap-4">
        <h2
          id={`reviews-${sort}-heading`}
          className="text-lg font-semibold tracking-tight"
        >
          {t(titleKey)}
        </h2>
        {hasReviews && (
          <Link
            href={feedHref(kind, targetId, sort)}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("reviews.more")}
            <ArrowRight className="size-3.5" />
          </Link>
        )}
      </header>

      <div className="space-y-3">
        {isLoading &&
          Array.from({ length: limit }).map((_, i) => (
            <ReviewCardSkeleton key={i} />
          ))}

        {!isLoading && !hasReviews && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {t(emptyKey)}
          </p>
        )}

        {!isLoading &&
          hasReviews &&
          reviews.map((r) => <ReviewCard key={r.id} review={r} kind={kind} />)}
      </div>
    </section>
  );
}
