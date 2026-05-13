import { api } from "@/lib/api";
import type { PagedResponse } from "@/types/movie";
import type {
  LikeState,
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
};
