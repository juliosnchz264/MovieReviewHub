import { api } from "@/lib/api";
import type { PagedResponse } from "@/types/movie";
import type {
  MovieRatingStats,
  Review,
  ReviewRequest,
} from "@/types/review";

export const reviewsService = {
  async findByMovie(movieId: number, page = 0, size = 20): Promise<PagedResponse<Review>> {
    const { data } = await api.get<PagedResponse<Review>>(
      `/movies/${movieId}/reviews`,
      { params: { page, size } }
    );
    return data;
  },

  async getStats(movieId: number): Promise<MovieRatingStats> {
    const { data } = await api.get<MovieRatingStats>(`/movies/${movieId}/reviews/stats`);
    return data;
  },

  async create(movieId: number, payload: ReviewRequest): Promise<Review> {
    const { data } = await api.post<Review>(`/movies/${movieId}/reviews`, payload);
    return data;
  },

  async update(reviewId: number, payload: ReviewRequest): Promise<Review> {
    const { data } = await api.put<Review>(`/reviews/${reviewId}`, payload);
    return data;
  },

  async remove(reviewId: number): Promise<void> {
    await api.delete(`/reviews/${reviewId}`);
  },

  async myReviews(page = 0, size = 20): Promise<PagedResponse<Review>> {
    const { data } = await api.get<PagedResponse<Review>>("/users/me/reviews", {
      params: { page, size },
    });
    return data;
  },
};
