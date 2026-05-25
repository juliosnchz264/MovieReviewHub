import { api } from "@/lib/api";
import type { PagedResponse } from "@/types/movie";
import type {
  LikeState,
  ReplyLikeState,
  ReviewCard,
  ReviewKind,
  ReviewReply,
  ReviewReplyRequest,
  ReviewSort,
} from "@/types/review";

function targetPath(kind: ReviewKind): string {
  return kind === "movie" ? "movies" : "series";
}

function reviewPath(kind: ReviewKind): string {
  return kind === "movie" ? "reviews" : "series-reviews";
}

export const reviewSocialService = {
  async section(kind: ReviewKind, targetId: number, sort: ReviewSort, limit = 3): Promise<ReviewCard[]> {
    const { data } = await api.get<ReviewCard[]>(
      `/${targetPath(kind)}/${targetId}/reviews/${sort}`,
      { params: { limit } }
    );
    return data;
  },

  async feed(
    kind: ReviewKind,
    targetId: number,
    sort: ReviewSort,
    page = 0,
    size = 12
  ): Promise<PagedResponse<ReviewCard>> {
    const { data } = await api.get<PagedResponse<ReviewCard>>(
      `/${targetPath(kind)}/${targetId}/reviews/feed`,
      { params: { sort, page, size } }
    );
    return data;
  },

  async detail(kind: ReviewKind, reviewId: number): Promise<ReviewCard> {
    const { data } = await api.get<ReviewCard>(`/${reviewPath(kind)}/${reviewId}`);
    return data;
  },

  async like(kind: ReviewKind, reviewId: number): Promise<LikeState> {
    const { data } = await api.post<LikeState>(`/${reviewPath(kind)}/${reviewId}/like`);
    return data;
  },

  async unlike(kind: ReviewKind, reviewId: number): Promise<LikeState> {
    const { data } = await api.delete<LikeState>(`/${reviewPath(kind)}/${reviewId}/like`);
    return data;
  },

  async likeState(kind: ReviewKind, reviewId: number): Promise<LikeState> {
    const { data } = await api.get<LikeState>(`/${reviewPath(kind)}/${reviewId}/like`);
    return data;
  },

  async listReplies(
    kind: ReviewKind,
    reviewId: number,
    page = 0,
    size = 20
  ): Promise<PagedResponse<ReviewReply>> {
    const { data } = await api.get<PagedResponse<ReviewReply>>(
      `/${reviewPath(kind)}/${reviewId}/replies`,
      { params: { page, size } }
    );
    return data;
  },

  async createReply(
    kind: ReviewKind,
    reviewId: number,
    payload: ReviewReplyRequest
  ): Promise<ReviewReply> {
    const { data } = await api.post<ReviewReply>(
      `/${reviewPath(kind)}/${reviewId}/replies`,
      payload
    );
    return data;
  },

  async updateReply(replyId: number, payload: ReviewReplyRequest): Promise<ReviewReply> {
    const { data } = await api.put<ReviewReply>(`/review-replies/${replyId}`, payload);
    return data;
  },

  async deleteReply(replyId: number): Promise<void> {
    await api.delete(`/review-replies/${replyId}`);
  },

  async likeReply(replyId: number): Promise<ReplyLikeState> {
    const { data } = await api.post<ReplyLikeState>(`/review-replies/${replyId}/like`);
    return data;
  },

  async unlikeReply(replyId: number): Promise<ReplyLikeState> {
    const { data } = await api.delete<ReplyLikeState>(`/review-replies/${replyId}/like`);
    return data;
  },

  /**
   * Load every active reply in a thread anchored at {@code rootReplyId},
   * including the root itself. Used for deep-link / ancestry rehydration —
   * the live UI uses {@code listChildren} for lazy per-level expansion.
   */
  async loadThread(rootReplyId: number): Promise<ReviewReply[]> {
    const { data } = await api.get<ReviewReply[]>(
      `/review-replies/${rootReplyId}/thread`
    );
    return data;
  },

  /**
   * Direct children of a reply, paginated. Powers Reddit-style lazy
   * expansion: each node loads only its immediate children on demand.
   */
  async listChildren(
    parentReplyId: number,
    page = 0,
    size = 10
  ): Promise<PagedResponse<ReviewReply>> {
    const { data } = await api.get<PagedResponse<ReviewReply>>(
      `/review-replies/${parentReplyId}/children`,
      { params: { page, size } }
    );
    return data;
  },

  /**
   * Ancestry chain (root → target inclusive) for a reply. Used to
   * rehydrate the parent path when deep-linking to a nested reply from a
   * notification, so the UI can pre-populate caches and auto-expand each
   * node leading to the target.
   */
  async loadAncestry(replyId: number): Promise<ReviewReply[]> {
    const { data } = await api.get<ReviewReply[]>(
      `/review-replies/${replyId}/ancestry`
    );
    return data;
  },
};
