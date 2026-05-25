import type { QueryClient } from "@tanstack/react-query";
import type { PagedResponse } from "@/types/movie";
import type { ReviewCard, ReviewKind, ReviewReply } from "@/types/review";

type ReviewCardCache =
  | ReviewCard
  | ReviewCard[]
  | PagedResponse<ReviewCard>
  | { pages: PagedResponse<ReviewCard>[]; pageParams: unknown[] }
  | null
  | undefined;

function isCard(v: unknown): v is ReviewCard {
  return !!v && typeof v === "object" && "id" in v && "likeCount" in v && "rating" in v;
}

function isCardArray(v: unknown): v is ReviewCard[] {
  return Array.isArray(v) && (v.length === 0 || isCard(v[0]));
}

function isPaged(v: unknown): v is PagedResponse<ReviewCard> {
  return !!v && typeof v === "object" && "content" in v && Array.isArray((v as { content: unknown }).content);
}

function isInfinite(
  v: unknown
): v is { pages: PagedResponse<ReviewCard>[]; pageParams: unknown[] } {
  return !!v && typeof v === "object" && "pages" in v && Array.isArray((v as { pages: unknown }).pages);
}

/**
 * Walk every shape of cached review-card data and apply `updater` to any card
 * whose id matches. Supports single cards, plain arrays, paged responses,
 * and infinite-query caches.
 */
export function patchReviewInCaches(
  qc: QueryClient,
  kind: ReviewKind,
  reviewId: number,
  updater: (card: ReviewCard) => ReviewCard
): void {
  const mapCard = (c: ReviewCard) => (c.id === reviewId ? updater(c) : c);

  qc.setQueriesData<ReviewCardCache>(
    { queryKey: ["reviews", kind] },
    (old) => {
      if (old == null) return old;
      if (isCard(old)) return old.id === reviewId ? updater(old) : old;
      if (isCardArray(old)) return old.map(mapCard);
      if (isPaged(old)) return { ...old, content: old.content.map(mapCard) };
      if (isInfinite(old)) {
        return {
          ...old,
          pages: old.pages.map((p) => ({ ...p, content: p.content.map(mapCard) })),
        };
      }
      return old;
    }
  );
}

type ReplyCache =
  | { pages: PagedResponse<ReviewReply>[]; pageParams: unknown[] }
  | null
  | undefined;

function isReplyInfinite(
  v: unknown
): v is { pages: PagedResponse<ReviewReply>[]; pageParams: unknown[] } {
  return !!v && typeof v === "object" && "pages" in v && Array.isArray((v as { pages: unknown }).pages);
}

/**
 * Patch a single reply across every reply cache: top-level infinite list
 * (`["review-replies", kind, reviewId]`), every open per-level children
 * infinite cache (`["review-reply-children", parentId]`), AND any legacy
 * thread array (`["review-thread", rootId]`). Required so reply-likes on
 * nested replies actually update the UI regardless of which cache holds
 * the reply.
 */
export function patchReplyInCaches(
  qc: QueryClient,
  kind: ReviewKind,
  reviewId: number,
  replyId: number,
  updater: (reply: ReviewReply) => ReviewReply
): void {
  const mapReply = (r: ReviewReply) => (r.id === replyId ? updater(r) : r);

  qc.setQueriesData<ReplyCache>(
    { queryKey: ["review-replies", kind, reviewId] },
    (old) => {
      if (!isReplyInfinite(old)) return old;
      return {
        ...old,
        pages: old.pages.map((p) => ({ ...p, content: p.content.map(mapReply) })),
      };
    }
  );

  qc.setQueriesData<ReplyCache>(
    { queryKey: ["review-reply-children"] },
    (old) => {
      if (!isReplyInfinite(old)) return old;
      return {
        ...old,
        pages: old.pages.map((p) => ({ ...p, content: p.content.map(mapReply) })),
      };
    }
  );

  qc.setQueriesData<ReviewReply[] | undefined>(
    { queryKey: ["review-thread"] },
    (old) => {
      if (!Array.isArray(old)) return old;
      return old.map(mapReply);
    }
  );
}

/**
 * Locate a reply by id across every loaded reply cache. Used by the
 * optimistic-insert path to derive a parent's depth + rootReplyId before
 * the server response lands.
 */
export function findReplyInCaches(
  qc: QueryClient,
  kind: ReviewKind,
  reviewId: number,
  replyId: number
): ReviewReply | null {
  const tl = qc.getQueryData<ReplyCache>(["review-replies", kind, reviewId]);
  if (isReplyInfinite(tl)) {
    for (const p of tl.pages) {
      for (const r of p.content) {
        if (r.id === replyId) return r;
      }
    }
  }
  const children = qc.getQueriesData<ReplyCache>({
    queryKey: ["review-reply-children"],
  });
  for (const [, data] of children) {
    if (!isReplyInfinite(data)) continue;
    for (const p of data.pages) {
      for (const r of p.content) {
        if (r.id === replyId) return r;
      }
    }
  }
  const threads = qc.getQueriesData<ReviewReply[] | undefined>({
    queryKey: ["review-thread"],
  });
  for (const [, arr] of threads) {
    if (!Array.isArray(arr)) continue;
    for (const r of arr) {
      if (r.id === replyId) return r;
    }
  }
  return null;
}
