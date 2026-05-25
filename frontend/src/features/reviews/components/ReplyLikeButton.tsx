"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToggleReplyLike } from "@/features/reviews/hooks/useReviewSocial";
import { useAuthStore } from "@/store/auth";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
import type { ReviewKind } from "@/types/review";

interface Props {
  kind: ReviewKind;
  reviewId: number;
  replyId: number;
  liked: boolean;
  likeCount: number;
  ownReply?: boolean;
}

/**
 * Heart toggle for replies. Mirrors ReviewLikeButton:
 *   - Own reply  → inert badge (no click, no error toast).
 *   - Anonymous  → redirect to /login on click.
 *   - Authed     → optimistic toggle via useToggleReplyLike.
 */
export function ReplyLikeButton({
  kind,
  reviewId,
  replyId,
  liked,
  likeCount,
  ownReply = false,
}: Props) {
  const t = useTranslate();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const toggle = useToggleReplyLike(kind, reviewId, replyId);

  if (ownReply) {
    return (
      <span
        aria-label={t("reviews.likesCount", { n: likeCount })}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground"
      >
        <Heart className="size-3.5" aria-hidden />
        <span className="tabular-nums">{likeCount}</span>
      </span>
    );
  }

  const onClick = () => {
    if (toggle.isPending) return;
    if (!accessToken) {
      router.push("/login");
      return;
    }
    toggle.mutate({ wantLiked: !liked });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={liked}
      aria-busy={toggle.isPending}
      aria-label={liked ? t("reviews.liked") : t("reviews.likeButton")}
      disabled={toggle.isPending}
      className={cn(
        "group inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 -mx-1.5 text-xs transition-colors",
        "hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-80"
      )}
    >
      <Heart
        className={cn(
          "size-3.5 transition-all duration-150",
          liked
            ? "fill-rose-500 text-rose-500"
            : "text-muted-foreground group-hover:text-rose-500",
          toggle.isPending && "animate-pulse"
        )}
      />
      <span
        className={cn(
          "tabular-nums",
          liked ? "text-rose-500" : "text-muted-foreground group-hover:text-foreground"
        )}
      >
        {likeCount}
      </span>
    </button>
  );
}
