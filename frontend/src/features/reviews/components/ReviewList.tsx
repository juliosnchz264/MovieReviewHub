"use client";

import { useState } from "react";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { RatingStars } from "./RatingStars";
import { ReviewForm } from "./ReviewForm";
import { useDeleteReview, useUpdateReview } from "@/features/reviews/hooks/useReviews";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import type { Review } from "@/types/review";
import type { ApiError } from "@/types/auth";

interface Props {
  reviews: Review[];
  movieId: number;
}

export function ReviewList({ reviews, movieId }: Props) {
  const { data: currentUser } = useCurrentUser();
  const [editingId, setEditingId] = useState<number | null>(null);
  const deleteMutation = useDeleteReview();

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
        <ReviewItem
          key={review.id}
          review={review}
          movieId={movieId}
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

interface ItemProps {
  review: Review;
  movieId: number;
  isEditing: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
  onDelete: () => void;
}

function ReviewItem({
  review,
  movieId,
  isEditing,
  canEdit,
  canDelete,
  onEditStart,
  onEditEnd,
  onDelete,
}: ItemProps) {
  const update = useUpdateReview(review.id, movieId);

  if (isEditing) {
    return (
      <li>
        <ReviewForm
          initial={review}
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
          <p className="text-sm font-medium">{review.username}</p>
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
