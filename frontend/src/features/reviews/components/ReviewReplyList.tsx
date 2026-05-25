"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ReviewReplyForm } from "@/features/reviews/components/ReviewReplyForm";
import { ReviewReplyThread } from "@/features/reviews/components/ReviewReplyThread";
import { AutoExpandContext } from "@/features/reviews/hooks/AutoExpandContext";
import { useReplyDeepLink } from "@/features/reviews/hooks/useReplyDeepLink";
import { useReviewReplies } from "@/features/reviews/hooks/useReviewSocial";
import { useAuthStore } from "@/store/auth";
import { useIntersection } from "@/hooks/useIntersection";
import { useTranslate } from "@/hooks/useTranslate";
import type { ReviewKind } from "@/types/review";

interface Props {
  kind: ReviewKind;
  reviewId: number;
}

export function ReviewReplyList({ kind, reviewId }: Props) {
  const t = useTranslate();
  const accessToken = useAuthStore((s) => s.accessToken);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const inView = useIntersection(sentinelRef);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useReviewReplies(kind, reviewId);

  const deepLink = useReplyDeepLink();
  const autoExpandValue = useMemo(
    () => ({
      expandIds: deepLink.expandIds,
      targetReplyId: deepLink.targetReplyId,
    }),
    [deepLink.expandIds, deepLink.targetReplyId]
  );

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const replies = useMemo(
    () => data?.pages.flatMap((p) => p.content) ?? [],
    [data]
  );

  return (
    <AutoExpandContext.Provider value={autoExpandValue}>
      <section id="replies" aria-labelledby="replies-heading" className="space-y-4 pt-2">
        <h2 id="replies-heading" className="text-lg font-semibold">
          {t("reviews.repliesHeading")}
        </h2>

        {accessToken ? (
          <ReviewReplyForm kind={kind} reviewId={reviewId} />
        ) : (
          <div className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
            <Link href="/login" className="text-primary hover:underline">
              {t("reviews.signInToReply")}
            </Link>
          </div>
        )}

        {isLoading && (
          <p className="text-sm text-muted-foreground">{t("reviews.loadingMore")}</p>
        )}

        {!isLoading && replies.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {t("reviews.noReplies")}
          </p>
        )}

        <ul className="space-y-3">
          {replies.map((r) => (
            <ReviewReplyThread
              key={r.id}
              root={r}
              kind={kind}
              reviewId={reviewId}
            />
          ))}
        </ul>

        {hasNextPage && (
          <div className="flex justify-center pt-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? t("reviews.loadingMore") : t("reviews.loadMore")}
            </Button>
          </div>
        )}

        <div ref={sentinelRef} aria-hidden className="h-1" />
      </section>
    </AutoExpandContext.Provider>
  );
}
