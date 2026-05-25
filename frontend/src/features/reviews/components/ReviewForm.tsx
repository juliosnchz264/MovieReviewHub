"use client";

import { FormEvent, useState } from "react";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { RatingStars } from "./RatingStars";
import type { ReviewRequest } from "@/types/review";
import type { ApiError } from "@/types/auth";

interface ReviewSeed {
  rating: number;
  comment: string | null;
}

interface Props {
  initial?: ReviewSeed;
  onSubmit: (payload: ReviewRequest) => void;
  onCancel?: () => void;
  pending?: boolean;
  error?: AxiosError<ApiError> | null;
  submitLabel?: string;
}

export function ReviewForm({
  initial,
  onSubmit,
  onCancel,
  pending,
  error,
  submitLabel = "Submit review",
}: Props) {
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [comment, setComment] = useState(initial?.comment ?? "");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (rating < 0.5) return;
    onSubmit({ rating, comment: comment || null });
  }

  const message = error?.response?.data?.message ?? error?.message;

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Your rating</span>
        <RatingStars value={rating} onChange={setRating} size="lg" allowHalf />
      </div>

      <textarea
        rows={3}
        maxLength={4000}
        placeholder="Optional comment..."
        value={comment ?? ""}
        onChange={(e) => setComment(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
      />

      {message && <p className="text-sm text-destructive">{message}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending || rating < 0.5}>
          {pending ? "Saving..." : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
