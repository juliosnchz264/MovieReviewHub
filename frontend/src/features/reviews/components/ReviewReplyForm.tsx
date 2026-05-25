"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCreateReply } from "@/features/reviews/hooks/useReviewSocial";
import { useTranslate } from "@/hooks/useTranslate";
import type { ReviewKind } from "@/types/review";

interface Props {
  kind: ReviewKind;
  reviewId: number;
  /**
   * Set when the form is composing a nested reply. Null/undefined creates a
   * top-level reply on the review. Validated server-side against the parent's
   * target + depth ceiling (MAX_DEPTH = 3).
   */
  parentReplyId?: number | null;
  autoFocus?: boolean;
  onSubmitted?: () => void;
  onCancel?: () => void;
  placeholder?: string;
  submitLabel?: string;
}

export function ReviewReplyForm({
  kind,
  reviewId,
  parentReplyId,
  autoFocus,
  onSubmitted,
  onCancel,
  placeholder,
  submitLabel,
}: Props) {
  const t = useTranslate();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const create = useCreateReply(kind, reviewId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (text.length === 0) {
      setError(t("reviews.replyEmpty"));
      return;
    }
    if (text.length > 2000) {
      setError(t("reviews.replyTooLong"));
      return;
    }
    setError(null);
    create.mutate(
      { body: text, parentReplyId: parentReplyId ?? null },
      {
        onSuccess: () => {
          setBody("");
          onSubmitted?.();
        },
      }
    );
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={2000}
        autoFocus={autoFocus}
        placeholder={placeholder ?? t("reviews.writeReplyPlaceholder")}
        aria-label={placeholder ?? t("reviews.writeReplyPlaceholder")}
        className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {body.length}/2000
        </span>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-destructive">{error}</span>}
          {onCancel && (
            <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
              {t("common.cancel")}
            </Button>
          )}
          <Button type="submit" size="sm" disabled={create.isPending}>
            {create.isPending
              ? t("reviews.loadingMore")
              : submitLabel ?? t("reviews.sendReply")}
          </Button>
        </div>
      </div>
    </form>
  );
}
