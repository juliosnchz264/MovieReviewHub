import type { PagedResponse } from "./movie";

export type NotificationType =
  | "REVIEW_LIKED"
  | "REVIEW_REPLIED"
  | "REPLY_ANSWERED"
  | "REPLY_LIKED"
  | "THREAD_ACTIVITY";

export type NotificationTargetKind = "REVIEW_MOVIE" | "REVIEW_SERIES" | "REPLY";

export interface NotificationActor {
  id: number;
  username: string;
  avatarUrl: string | null;
}

export interface NotificationTarget {
  kind: NotificationTargetKind;
  id: number;
  parentKind: NotificationTargetKind | null;
  parentReviewId: number | null;
  title: string | null;
  posterUrl: string | null;
  preview: string | null;
}

export interface NotificationItem {
  id: number;
  type: NotificationType;
  actor: NotificationActor | null;
  groupCount: number;
  target: NotificationTarget | null;
  read: boolean;
  seen: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NotificationFilter = "all" | "unread";

export type NotificationPage = PagedResponse<NotificationItem>;

export interface UnreadCount {
  count: number;
}
