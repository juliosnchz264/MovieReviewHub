"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToggleReviewLike } from "@/features/reviews/hooks/useReviewSocial";
import { useAuthStore } from "@/store/auth";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
import type { ReviewKind } from "@/types/review";

interface Props {
  kind: ReviewKind;
  reviewId: number;
  liked: boolean;
  likeCount: number;
  size?: "sm" | "md";
  ownReview?: boolean;
}

export function ReviewLikeButton({
  kind,
  reviewId,
  liked,
  likeCount,
  size = "md",
  ownReview = false,
}: Props) {
  const t = useTranslate();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const toggle = useToggleReviewLike(kind, reviewId);

  const iconSize = size === "sm" ? "size-4" : "size-[18px]";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  // Own review → render an inert badge instead of a button. No toast, no
  // disabled state, no click affordance: the user cannot like themselves so
  // pretending the action exists is just bad UX.
  if (ownReview) {
    return (
      <span
        aria-label={t("reviews.likesCount", { n: likeCount })}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 -mx-2 text-muted-foreground",
          textSize
        )}
      >
        <Heart className={iconSize} aria-hidden />
        <span className="tabular-nums">
          {t(likeCount === 1 ? "reviews.likesOne" : "reviews.likesMany", { n: likeCount })}
        </span>
      </span>
    );
  }

  const onClick = () => {
    // Gate rapid clicks — `scope.id` already queues server-side, but we don't
    // want to enqueue more than one pending toggle from a single user gesture.
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
        "group inline-flex items-center gap-1.5 rounded-md px-2 py-1 -mx-2 transition-colors",
        "hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-80",
        textSize
      )}
    >
      <Heart
        className={cn(
          iconSize,
          "transition-all duration-150",
          liked
            ? "fill-rose-500 text-rose-500"
            : "text-muted-foreground group-hover:text-rose-500",
          toggle.isPending && "animate-pulse"
        )}
      />
      <span
        className={cn(
          "font-medium",
          liked ? "text-rose-500" : "text-muted-foreground group-hover:text-foreground"
        )}
      >
        {liked ? t("reviews.liked") : t("reviews.likeButton")}
      </span>
      <span className="text-muted-foreground">·</span>
      <span className="text-muted-foreground tabular-nums">
        {t(likeCount === 1 ? "reviews.likesOne" : "reviews.likesMany", { n: likeCount })}
      </span>
    </button>
  );
}
