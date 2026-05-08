import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PagedResponse } from "@/types/movie";
import type { MovieRatingStats, ReviewRequest } from "@/types/review";

export interface SeriesReview {
  id: number;
  rating: number;
  comment: string | null;
  userId: number;
  username: string;
  seriesId: number;
  seriesTitle: string;
  createdAt: string;
  updatedAt: string;
}

export const seriesReviewsService = {
  async findBySeries(seriesId: number, page = 0, size = 20): Promise<PagedResponse<SeriesReview>> {
    const { data } = await api.get<PagedResponse<SeriesReview>>(
      `/series/${seriesId}/reviews`,
      { params: { page, size } }
    );
    return data;
  },
  async getStats(seriesId: number): Promise<MovieRatingStats> {
    const { data } = await api.get<MovieRatingStats>(`/series/${seriesId}/reviews/stats`);
    return data;
  },
  async create(seriesId: number, payload: ReviewRequest): Promise<SeriesReview> {
    const { data } = await api.post<SeriesReview>(`/series/${seriesId}/reviews`, payload);
    return data;
  },
  async update(reviewId: number, payload: ReviewRequest): Promise<SeriesReview> {
    const { data } = await api.put<SeriesReview>(`/series-reviews/${reviewId}`, payload);
    return data;
  },
  async remove(reviewId: number): Promise<void> {
    await api.delete(`/series-reviews/${reviewId}`);
  },
  async myReviews(page = 0, size = 20): Promise<PagedResponse<SeriesReview>> {
    const { data } = await api.get<PagedResponse<SeriesReview>>("/users/me/series-reviews", {
      params: { page, size },
    });
    return data;
  },
};

function invalidate(qc: ReturnType<typeof useQueryClient>, seriesId?: number) {
  if (seriesId !== undefined) {
    qc.invalidateQueries({ queryKey: ["series-reviews", "series", seriesId] });
    qc.invalidateQueries({ queryKey: ["series-reviews", "stats", seriesId] });
  } else {
    qc.invalidateQueries({ queryKey: ["series-reviews"] });
  }
  qc.invalidateQueries({ queryKey: ["series-reviews", "me"] });
  qc.invalidateQueries({ queryKey: ["admin", "stats"] });
  qc.invalidateQueries({ queryKey: ["series", "trending"] });
  qc.invalidateQueries({ queryKey: ["series", "top-rated"] });
}

export function useSeriesReviews(seriesId: number, page = 0, size = 20) {
  return useQuery({
    queryKey: ["series-reviews", "series", seriesId, page, size],
    queryFn: () => seriesReviewsService.findBySeries(seriesId, page, size),
    placeholderData: keepPreviousData,
    enabled: Number.isFinite(seriesId),
  });
}

export function useSeriesRatingStats(seriesId: number) {
  return useQuery({
    queryKey: ["series-reviews", "stats", seriesId],
    queryFn: () => seriesReviewsService.getStats(seriesId),
    enabled: Number.isFinite(seriesId),
  });
}

export function useMySeriesReviews(page = 0, size = 20) {
  return useQuery({
    queryKey: ["series-reviews", "me", page, size],
    queryFn: () => seriesReviewsService.myReviews(page, size),
    placeholderData: keepPreviousData,
  });
}

export function useCreateSeriesReview(seriesId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReviewRequest) => seriesReviewsService.create(seriesId, payload),
    onSuccess: () => invalidate(qc, seriesId),
  });
}

export function useUpdateSeriesReview(reviewId: number, seriesId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReviewRequest) => seriesReviewsService.update(reviewId, payload),
    onSuccess: () => invalidate(qc, seriesId),
  });
}

export function useDeleteSeriesReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: number) => seriesReviewsService.remove(reviewId),
    onSuccess: () => invalidate(qc),
  });
}
