"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ReviewCard } from "@/features/reviews/components/ReviewCard";
import { ReviewReplyList } from "@/features/reviews/components/ReviewReplyList";
import { useReviewDetail } from "@/features/reviews/hooks/useReviewSocial";
import { useTranslate } from "@/hooks/useTranslate";
import type { ReviewKind } from "@/types/review";

interface Props {
  kind: ReviewKind;
  reviewId: number;
}

function targetHref(kind: ReviewKind, id: number) {
  return kind === "movie" ? `/movies/${id}` : `/series/${id}`;
}

export function ReviewDetailView({ kind, reviewId }: Props) {
  const t = useTranslate();
  const { data: review, isLoading, isError } = useReviewDetail(kind, reviewId);

  return (
    <>
      <Navbar />
      <main className="min-h-screen px-4 py-10">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          {review && (
            <Link href={targetHref(kind, review.targetId)}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="size-3.5" />
                {t("reviews.backToTitle", { title: review.targetTitle })}
              </Button>
            </Link>
          )}

          {isLoading && (
            <>
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </>
          )}

          {isError && (
            <p className="text-destructive">{t("reviews.detailNotFound")}</p>
          )}

          {review && (
            <>
              <header className="flex items-center gap-4">
                <Link
                  href={targetHref(kind, review.targetId)}
                  className="relative aspect-2/3 w-16 overflow-hidden rounded-md border border-border bg-muted"
                >
                  {review.targetPosterUrl && (
                    <Image
                      src={review.targetPosterUrl}
                      alt={review.targetTitle}
                      fill
                      sizes="64px"
                      className="object-cover"
                      unoptimized
                    />
                  )}
                </Link>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t("reviews.detailTitle")}
                  </p>
                  <h1 className="truncate text-xl font-semibold">
                    <Link
                      href={targetHref(kind, review.targetId)}
                      className="hover:underline"
                    >
                      {review.targetTitle}
                    </Link>
                  </h1>
                </div>
              </header>

              <ReviewCard review={review} kind={kind} variant="full" />

              <ReviewReplyList kind={kind} reviewId={review.id} />
            </>
          )}
        </div>
      </main>
    </>
  );
}
