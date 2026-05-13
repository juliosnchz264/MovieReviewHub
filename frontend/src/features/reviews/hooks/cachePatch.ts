import type { QueryClient } from "@tanstack/react-query";
import type { PagedResponse } from "@/types/movie";
import type { ReviewCard, ReviewKind } from "@/types/review";

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
