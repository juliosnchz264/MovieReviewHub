"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAdminReviews } from "@/features/admin/hooks/useAdmin";
import { useDeleteReview } from "@/features/reviews/hooks/useReviews";
import { RatingStars } from "@/features/reviews/components/RatingStars";

const PAGE_SIZE = 20;

export default function AdminReviewsPage() {
  const [page, setPage] = useState(0);
  const { data, isLoading, isError } = useAdminReviews(page, PAGE_SIZE);
  // Admin deletes are cross-movie, so the hook gets no movieId and skips the
  // optimistic my-review patch. Toasts come from the hook itself.
  const remove = useDeleteReview();

  function onDelete(id: number, username: string, movieTitle: string) {
    if (!confirm(`Delete review by ${username} on "${movieTitle}"?`)) return;
    remove.mutate(id);
  }

  return (
    <div className="space-y-4">
      {isLoading && <p className="text-muted-foreground">Loading...</p>}
      {isError && <p className="text-destructive">Failed to load</p>}

      {data && data.content.length === 0 && (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No reviews yet
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
                      by {review.username}
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
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.page + 1} of {data.totalPages} • {data.totalElements} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={data.first}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={data.last}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
