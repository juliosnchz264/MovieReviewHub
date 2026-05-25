import type { ReviewKind, ReviewSort } from "@/types/review";

/**
 * Single source of truth for review-related TanStack Query keys.
 *
 * Every key starts with ["reviews", kind, …] so a single
 * {@code invalidateQueries({ queryKey: reviewKeys.byKind(kind) })} reliably
 * refreshes lists, sections, feeds, details, stats, and "my review" for that
 * kind — fixing prior drift where create/update/delete invalidated only some
 * of those branches and the UI stayed stale.
 */
export const reviewKeys = {
  all: ["reviews"] as const,
  byKind: (kind: ReviewKind) => ["reviews", kind] as const,

  list: (kind: ReviewKind, targetId: number, page: number, size: number) =>
    ["reviews", kind, "list", targetId, page, size] as const,

  stats: (kind: ReviewKind, targetId: number) =>
    ["reviews", kind, "stats", targetId] as const,

  section: (kind: ReviewKind, targetId: number, sort: ReviewSort, limit: number) =>
    ["reviews", kind, "section", targetId, sort, limit] as const,

  feed: (kind: ReviewKind, targetId: number, sort: ReviewSort) =>
    ["reviews", kind, "feed", targetId, sort] as const,

  detail: (kind: ReviewKind, reviewId: number) =>
    ["reviews", kind, "detail", reviewId] as const,

  meList: (kind: ReviewKind, page: number, size: number) =>
    ["reviews", kind, "me-list", page, size] as const,

  myReview: (kind: ReviewKind, targetId: number) =>
    ["my-review", kind, targetId] as const,

  myReviewByKind: (kind: ReviewKind) => ["my-review", kind] as const,
};
