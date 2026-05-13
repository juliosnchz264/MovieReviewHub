"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { ReviewCard } from "@/features/reviews/components/ReviewCard";
import { ReviewCardSkeleton } from "@/features/reviews/components/ReviewCardSkeleton";
import { useReviewsFeed } from "@/features/reviews/hooks/useReviewSocial";
import { useIntersection } from "@/hooks/useIntersection";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
import type { ReviewKind, ReviewSort } from "@/types/review";

interface Props {
  kind: ReviewKind;
  targetId: number;
  initialSort: ReviewSort;
  targetTitle: string;
  targetHref: string;
}

export function ReviewsFeedView({
  kind,
  targetId,
  initialSort,
  targetTitle,
  targetHref,
}: Props) {
  const t = useTranslate();
  // Sort lives in URL via the route component; we let parent control via key remount,
  // but for a quick toggle we update the URL through Link. For simplicity here, sort
  // is fixed per render — page-level component is responsible for re-mounting on change.
  const sort = initialSort;

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const inView = useIntersection(sentinelRef);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useReviewsFeed(kind, targetId, sort);

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const reviews = useMemo(
    () => data?.pages.flatMap((p) => p.content) ?? [],
    [data]
  );

  const titleKey =
    kind === "movie" ? "reviews.feedTitleMovie" : "reviews.feedTitleSeries";

  return (
    <>
      <Navbar />
      <main className="min-h-screen px-4 py-10">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <Link href={targetHref}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="size-3.5" />
              {t("reviews.backToTitle", { title: targetTitle })}
            </Button>
          </Link>

          <header className="flex flex-wrap items-baseline justify-between gap-4">
            <h1 className="text-2xl font-semibold tracking-tight">
              {t(titleKey, { title: targetTitle })}
            </h1>

            <nav className="inline-flex rounded-full border border-border bg-card/50 p-0.5 text-sm">
              <SortPill
                href={feedHref(kind, targetId, "popular")}
                active={sort === "popular"}
                label={t("reviews.feedSortPopular")}
              />
              <SortPill
                href={feedHref(kind, targetId, "recent")}
                active={sort === "recent"}
                label={t("reviews.feedSortRecent")}
              />
            </nav>
          </header>

          <div className="space-y-3">
            {isLoading && (
              <>
                <ReviewCardSkeleton />
                <ReviewCardSkeleton />
                <ReviewCardSkeleton />
              </>
            )}

            {!isLoading && reviews.length === 0 && (
              <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                {t(sort === "popular" ? "reviews.emptyPopular" : "reviews.emptyRecent")}
              </p>
            )}

            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} kind={kind} />
            ))}

            {isFetchingNextPage && <ReviewCardSkeleton />}

            {!hasNextPage && reviews.length > 0 && (
              <p className="pt-4 text-center text-xs text-muted-foreground">
                {t("reviews.endOfFeed")}
              </p>
            )}
          </div>

          <div ref={sentinelRef} aria-hidden className="h-1" />
        </div>
      </main>
    </>
  );
}

function feedHref(kind: ReviewKind, id: number, sort: ReviewSort) {
  const path = kind === "movie" ? "movies" : "series";
  return `/${path}/${id}/reviews?sort=${sort}`;
}

function SortPill({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-3 py-1 transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </Link>
  );
}
