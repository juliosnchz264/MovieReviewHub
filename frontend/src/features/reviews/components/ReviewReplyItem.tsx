"use client";

import Link from "next/link";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/features/reviews/components/UserAvatar";
import { useDeleteReply, useUpdateReply } from "@/features/reviews/hooks/useReviewSocial";
import { useTranslate } from "@/hooks/useTranslate";
import type { ReviewKind, ReviewReply } from "@/types/review";

interface Props {
  reply: ReviewReply;
  kind: ReviewKind;
  reviewId: number;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

export function ReviewReplyItem({ reply, kind, reviewId }: Props) {
  const t = useTranslate();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(reply.body);
  const [error, setError] = useState<string | null>(null);

  const update = useUpdateReply(kind, reviewId);
  const remove = useDeleteReply(kind, reviewId);

  const edited = reply.updatedAt !== reply.createdAt;

  const onSave = () => {
    const body = draft.trim();
    if (body.length === 0) {
      setError(t("reviews.replyEmpty"));
      return;
    }
    if (body.length > 2000) {
      setError(t("reviews.replyTooLong"));
      return;
    }
    setError(null);
    update.mutate(
      { id: reply.id, payload: { body } },
      { onSuccess: () => setEditing(false) }
    );
  };

  const onDelete = () => {
    if (!confirm(t("reviews.replyDeleteConfirm"))) return;
    remove.mutate(reply.id);
  };

  return (
    <li className="flex gap-3 rounded-xl border border-border/60 bg-card/40 p-4">
      <Link href={`/users/${reply.userId}`} className="shrink-0">
        <UserAvatar url={reply.userAvatarUrl} name={reply.username} size={36} />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={`/users/${reply.userId}`}
            className="font-medium hover:underline"
          >
            {reply.username}
          </Link>
          <span className="text-xs text-muted-foreground">
            · {formatDate(reply.createdAt)}
            {edited && ` · ${t("reviews.replyEdited")}`}
          </span>
        </div>

        {editing ? (
          <div className="mt-2 space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={onSave} disabled={update.isPending}>
                {update.isPending ? t("reviews.loadingMore") : t("reviews.sendReply")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setDraft(reply.body);
                  setError(null);
                }}
              >
                ✕
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
            {reply.body}
          </p>
        )}

        {!editing && (reply.canEdit || reply.canDelete) && (
          <div className="mt-2 flex gap-1">
            {reply.canEdit && (
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setEditing(true)}
                aria-label={t("reviews.replyEditAction")}
              >
                <Pencil className="size-3" />
                {t("reviews.replyEditAction")}
              </Button>
            )}
            {reply.canDelete && (
              <Button
                size="xs"
                variant="ghost"
                onClick={onDelete}
                disabled={remove.isPending}
                aria-label={t("reviews.replyDeleteAction")}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3" />
                {t("reviews.replyDeleteAction")}
              </Button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
