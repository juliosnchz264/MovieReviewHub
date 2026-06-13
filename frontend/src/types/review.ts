import type { PagedResponse } from "./movie";

export interface Review {
  id: number;
  rating: number;
  comment: string | null;
  userId: number;
  username: string;
  movieId: number;
  movieTitle: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewRequest {
  rating: number;
  comment?: string | null;
}

export interface MovieRatingStats {
  average: number;
  count: number;
}

export type ReviewPage = PagedResponse<Review>;

export type ReviewKind = "movie" | "series";

export type ReviewTargetType = "MOVIE" | "SERIES";

export interface ReviewCard {
  id: number;
  kind: ReviewTargetType;
  rating: number;
  comment: string | null;
  userId: number;
  username: string;
  userAvatarUrl: string | null;
  targetId: number;
  targetTitle: string;
  targetPosterUrl: string | null;
  authorFavorited: boolean;
  likeCount: number;
  replyCount: number;
  likedByMe: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewReply {
  id: number;
  userId: number;
  username: string;
  userAvatarUrl: string | null;
  body: string;
  parentReplyId: number | null;
  rootReplyId: number | null;
  depth: number;
  childCount: number;
  likeCount: number;
  likedByMe: boolean;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  canDelete: boolean;
}

export interface ReviewReplyRequest {
  body: string;
  parentReplyId?: number | null;
}

export interface ReplyLikeState {
  replyId: number;
  likedByMe: boolean;
  likeCount: number;
}

export type ReviewSort = "popular" | "recent";

export type ReviewCardPage = PagedResponse<ReviewCard>;
export type ReviewReplyPage = PagedResponse<ReviewReply>;

export interface LikeState {
  reviewId: number;
  kind: ReviewTargetType;
  likedByMe: boolean;
  likeCount: number;
}
