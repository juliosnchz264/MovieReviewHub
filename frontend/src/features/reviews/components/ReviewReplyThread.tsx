"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReviewReplyItem } from "@/features/reviews/components/ReviewReplyItem";
import { useAutoExpand } from "@/features/reviews/hooks/AutoExpandContext";
import { useReplyChildren } from "@/features/reviews/hooks/useReviewSocial";
import { useTranslate } from "@/hooks/useTranslate";
import type { ReviewKind, ReviewReply } from "@/types/review";

interface Props {
  root: ReviewReply;
  kind: ReviewKind;
  reviewId: number;
}

/**
 * Entry point used by {@link ReviewReplyList}: wraps a top-level reply in
 * an `<li>` and delegates to {@link ReplyNode}, which handles its own
 * lazy per-level expansion.
 */
export function ReviewReplyThread({ root, kind, reviewId }: Props) {
  return (
    <li>
      <ReplyNode reply={root} kind={kind} reviewId={reviewId} />
    </li>
  );
}

interface NodeProps {
  reply: ReviewReply;
  kind: ReviewKind;
  reviewId: number;
}

/**
 * Reddit-style lazy reply node. Each node owns its own `expanded` state and
 * fetches ONLY its direct children when the user opens it — never the whole
 * subtree. Grandchildren stay collapsed behind a "Show N replies" toggle
 * on each child, keeping render and network cost proportional to what the
 * user actually opens.
 */
function ReplyNode({ reply, kind, reviewId }: NodeProps) {
  const t = useTranslate();
  const { expandIds, targetReplyId } = useAutoExpand();
  // Auto-expand flows in from deep-link rehydration; user toggle overrides
  // it. While the user hasn't acted, `userExpanded === null` and auto wins;
  // once they click, their choice locks in. This avoids a setState-in-effect
  // pattern when the (async) ancestry chain resolves.
  const autoExpanded = expandIds.has(reply.id);
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null);
  const expanded = userExpanded ?? autoExpanded;
  const toggle = () => setUserExpanded((prev) => !(prev ?? autoExpanded));

  // If this reply IS the deep-link target, scroll it into view + briefly
  // highlight once it has actually rendered. Ancestors handle their own
  // expansion above, so by the time this node mounts the path is open.
  useEffect(() => {
    if (reply.id !== targetReplyId) return;
    const el = document.getElementById(`reply-${reply.id}`);
    if (!el) return;
    const timer = setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary/60");
      const release = setTimeout(
        () => el.classList.remove("ring-2", "ring-primary/60"),
        2500
      );
      return () => clearTimeout(release);
    }, 60);
    return () => clearTimeout(timer);
  }, [reply.id, targetReplyId]);

  const {
    data,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useReplyChildren(reply.id, expanded);

  const children = useMemo(
    () => data?.pages.flatMap((p) => p.content) ?? [],
    [data]
  );

  const total = reply.childCount;

  return (
    <>
      <ReviewReplyItem reply={reply} kind={kind} reviewId={reviewId} />

      {total > 0 && (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={expanded}
          className="ml-12 mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-primary transition hover:bg-primary/10"
        >
          {expanded ? (
            <ChevronDown className="size-3.5" aria-hidden />
          ) : (
            <ChevronRight className="size-3.5" aria-hidden />
          )}
          {expanded
            ? t(total === 1 ? "reviews.hideRepliesOne" : "reviews.hideRepliesMany", { n: total })
            : t(total === 1 ? "reviews.showRepliesOne" : "reviews.showRepliesMany", { n: total })}
        </button>
      )}

      {expanded && (
        <div className="mt-3">
          {isLoading ? (
            <div className="ml-12 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              {t("reviews.loadingMore")}
            </div>
          ) : children.length === 0 ? null : (
            <ul className="ml-6 space-y-3 border-l border-border/70 pl-4 sm:ml-8 sm:pl-5">
              {children.map((c) => (
                <li key={c.id}>
                  <ReplyNode reply={c} kind={kind} reviewId={reviewId} />
                </li>
              ))}
              {hasNextPage && (
                <li>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage
                      ? t("reviews.loadingMore")
                      : t("reviews.loadMore")}
                  </Button>
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
