import type { NotificationItem } from "@/types/notification";

/**
 * Resolves the in-app destination for a notification click. Returns null when
 * the underlying target has been removed (tombstone) so the UI can render the
 * item as non-clickable.
 */
export function notificationHref(n: NotificationItem): string | null {
  const target = n.target;
  if (!target) return null;

  if (target.kind === "REVIEW_MOVIE") {
    return `/reviews/${target.id}`;
  }
  if (target.kind === "REVIEW_SERIES") {
    return `/series-reviews/${target.id}`;
  }
  // REPLY: navigate to the parent review with an anchor to the specific reply.
  if (target.kind === "REPLY" && target.parentReviewId && target.parentKind) {
    const base = target.parentKind === "REVIEW_MOVIE" ? "reviews" : "series-reviews";
    return `/${base}/${target.parentReviewId}#reply-${target.id}`;
  }
  return null;
}
