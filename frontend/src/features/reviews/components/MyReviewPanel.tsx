"use client";

import { useState } from "react";
import { AxiosError } from "axios";
import { RatingStars } from "@/features/reviews/components/RatingStars";
import { ReviewForm } from "@/features/reviews/components/ReviewForm";
import { ReviewActionsMenu } from "@/features/reviews/components/ReviewActionsMenu";
import { useTranslate } from "@/hooks/useTranslate";
import type { ApiError } from "@/types/auth";
import type { ReviewRequest } from "@/types/review";

interface OwnReviewSummary {
  id: number;
  rating: number;
  comment: string | null;
}

interface Props {
  review: OwnReviewSummary;
  onUpdate: (payload: ReviewRequest) => void;
  onDelete: () => Promise<unknown> | void;
  updatePending: boolean;
  deletePending: boolean;
  updateError?: AxiosError<ApiError> | null;
}

/**
 * Inline panel that shows the current user's own review on a movie/series
 * detail page, with edit/delete affordances. Toggles between a read-only
 * view and a ReviewForm in edit mode without leaving the page.
 */
export function MyReviewPanel({
  review,
  onUpdate,
  onDelete,
  updatePending,
  deletePending,
  updateError,
}: Props) {
  const t = useTranslate();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <ReviewForm
        initial={review}
        onSubmit={(payload) => {
          onUpdate(payload);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
        pending={updatePending}
        error={updateError ?? null}
        submitLabel={t("reviews.saveChanges")}
      />
    );
  }

  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("reviews.yourReview")}
          </p>
          <RatingStars value={review.rating} readOnly size="sm" />
        </div>
        <ReviewActionsMenu
          canEdit
          canDelete
          onEdit={() => setEditing(true)}
          onDelete={onDelete}
          deleteTitle={t("reviews.deleteConfirmTitle")}
          deleteDescription={t("reviews.deleteConfirmDescription")}
        />
      </header>
      {review.comment && (
        <p className="mt-3 text-sm leading-relaxed text-foreground/85">
          {review.comment}
        </p>
      )}
      {deletePending && (
        <p className="mt-2 text-xs text-muted-foreground">{t("reviews.deleting")}</p>
      )}
    </article>
  );
}
