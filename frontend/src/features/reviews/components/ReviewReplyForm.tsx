"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCreateReply } from "@/features/reviews/hooks/useReviewSocial";
import { useTranslate } from "@/hooks/useTranslate";
import type { ReviewKind } from "@/types/review";

interface Props {
  kind: ReviewKind;
  reviewId: number;
}

export function ReviewReplyForm({ kind, reviewId }: Props) {
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
      { body: text },
      {
        onSuccess: () => setBody(""),
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
        placeholder={t("reviews.writeReplyPlaceholder")}
        aria-label={t("reviews.writeReplyPlaceholder")}
        className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {body.length}/2000
        </span>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-destructive">{error}</span>}
          <Button type="submit" size="sm" disabled={create.isPending}>
            {create.isPending ? t("reviews.loadingMore") : t("reviews.sendReply")}
          </Button>
        </div>
      </div>
    </form>
  );
}
