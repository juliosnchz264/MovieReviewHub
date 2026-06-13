"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAdminReviews } from "@/features/admin/hooks/useAdmin";
import { useDeleteReview } from "@/features/reviews/hooks/useReviews";
import { RatingStars } from "@/features/reviews/components/RatingStars";
import { useTranslate } from "@/hooks/useTranslate";

const PAGE_SIZE = 20;

export default function AdminReviewsPage() {
  const t = useTranslate();
  const [page, setPage] = useState(0);
  const { data, isLoading, isError } = useAdminReviews(page, PAGE_SIZE);
  // Admin deletes are cross-movie, so the hook gets no movieId and skips the
  // optimistic my-review patch. Toasts come from the hook itself.
  const remove = useDeleteReview();

  function onDelete(id: number, username: string, movieTitle: string) {
    if (!confirm(t("admin.reviews.confirmDelete", { username, movieTitle }))) return;
    remove.mutate(id);
  }

  return (
    <div className="space-y-4">
      {isLoading && <p className="text-muted-foreground">{t("admin.common.loading")}</p>}
      {isError && <p className="text-destructive">{t("admin.common.loadFailed")}</p>}

      {data && data.content.length === 0 && (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {t("admin.reviews.empty")}
        </p>
      )}

      {data && data.content.length > 0 && (
        <ul className="space-y-3">
          {data.content.map((review) => (
            <li
              key={review.id}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/movies/${review.movieId}`}
                      className="font-medium hover:underline"
                    >
                      {review.movieTitle}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {t("admin.reviews.by", { username: review.username })}
                    </span>
                  </div>
                  <RatingStars value={review.rating} size="sm" readOnly />
                  {review.comment && (
                    <p className="pt-1 text-sm text-foreground/80">{review.comment}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(review.createdAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={remove.isPending}
                  onClick={() => onDelete(review.id, review.username, review.movieTitle)}
                >
                  {t("admin.reviews.delete")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("admin.common.pageOfTotal", { page: data.page + 1, total: data.totalPages, count: data.totalElements })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={data.first}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              {t("admin.common.prev")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={data.last}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("admin.common.next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
