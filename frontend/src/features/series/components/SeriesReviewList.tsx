"use client";

import { useState } from "react";
import Link from "next/link";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/features/reviews/components/RatingStars";
import { ReviewForm } from "@/features/reviews/components/ReviewForm";
import {
  useDeleteSeriesReview,
  useUpdateSeriesReview,
  type SeriesReview,
} from "@/features/series/hooks/useSeriesReviews";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import type { ApiError } from "@/types/auth";

interface Props {
  reviews: SeriesReview[];
  seriesId: number;
}

export function SeriesReviewList({ reviews, seriesId }: Props) {
  const { data: currentUser } = useCurrentUser();
  const [editingId, setEditingId] = useState<number | null>(null);
  const deleteMutation = useDeleteSeriesReview();

  if (reviews.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No reviews yet. Be the first.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {reviews.map((review) => (
        <Item
          key={review.id}
          review={review}
          seriesId={seriesId}
          isEditing={editingId === review.id}
          canEdit={currentUser?.id === review.userId}
          canDelete={
            currentUser?.id === review.userId || currentUser?.role === "ROLE_ADMIN"
          }
          onEditStart={() => setEditingId(review.id)}
          onEditEnd={() => setEditingId(null)}
          onDelete={() => {
            if (confirm("Delete this review?")) {
              deleteMutation.mutate(review.id);
            }
          }}
        />
      ))}
    </ul>
  );
}

function Item({
  review,
  seriesId,
  isEditing,
  canEdit,
  canDelete,
  onEditStart,
  onEditEnd,
  onDelete,
}: {
  review: SeriesReview;
  seriesId: number;
  isEditing: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
  onDelete: () => void;
}) {
  const update = useUpdateSeriesReview(review.id, seriesId);

  if (isEditing) {
    return (
      <li>
        <ReviewForm
          initial={{
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            // Other fields irrelevant for ReviewForm initial
            userId: review.userId,
            username: review.username,
            movieId: review.seriesId,
            movieTitle: review.seriesTitle,
            createdAt: review.createdAt,
            updatedAt: review.updatedAt,
          }}
          submitLabel="Save changes"
          pending={update.isPending}
          error={update.error as AxiosError<ApiError> | null}
          onCancel={onEditEnd}
          onSubmit={(payload) =>
            update.mutate(payload, { onSuccess: () => onEditEnd() })
          }
        />
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <Link
            href={`/users/${review.userId}`}
            className="text-sm font-medium hover:underline focus-visible:underline focus-visible:outline-none"
          >
            {review.username}
          </Link>
          <RatingStars value={review.rating} size="sm" readOnly />
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button variant="ghost" size="sm" onClick={onEditStart}>
              Edit
            </Button>
          )}
          {canDelete && (
            <Button variant="destructive" size="sm" onClick={onDelete}>
              Delete
            </Button>
          )}
        </div>
      </div>
      {review.comment && (
        <p className="mt-2 text-sm leading-relaxed text-foreground/80">{review.comment}</p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        {new Date(review.createdAt).toLocaleDateString()}
      </p>
    </li>
  );
}
