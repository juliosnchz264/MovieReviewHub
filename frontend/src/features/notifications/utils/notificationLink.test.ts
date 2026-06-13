import { describe, it, expect } from "vitest";
import { notificationHref } from "./notificationLink";
import type { NotificationItem } from "@/types/notification";

function n(target: NotificationItem["target"]): NotificationItem {
  return {
    id: 1,
    type: "REVIEW_LIKED",
    actor: null,
    groupCount: 1,
    read: false,
    seen: false,
    createdAt: "",
    updatedAt: "",
    target,
  } as NotificationItem;
}

describe("notificationHref", () => {
  it("returns null when target is missing (tombstoned)", () => {
    expect(notificationHref(n(null))).toBeNull();
  });

  it("routes movie reviews to /reviews/:id", () => {
    expect(notificationHref(n({ kind: "REVIEW_MOVIE", id: 7 } as never)))
        .toBe("/reviews/7");
  });

  it("routes series reviews to /series-reviews/:id", () => {
    expect(notificationHref(n({ kind: "REVIEW_SERIES", id: 9 } as never)))
        .toBe("/series-reviews/9");
  });

  it("routes nested reply to its parent review with an anchor", () => {
    expect(notificationHref(n({
      kind: "REPLY",
      id: 22,
      parentReviewId: 100,
      parentKind: "REVIEW_MOVIE",
    } as never))).toBe("/reviews/100#reply-22");
  });

  it("returns null for REPLY without parent context", () => {
    expect(notificationHref(n({ kind: "REPLY", id: 22 } as never))).toBeNull();
  });
});
