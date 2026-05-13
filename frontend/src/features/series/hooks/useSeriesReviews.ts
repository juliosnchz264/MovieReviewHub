import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useTranslate } from "@/hooks/useTranslate";
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
  async myReview(seriesId: number): Promise<SeriesReview | null> {
    try {
      const { data } = await api.get<SeriesReview>(`/series/${seriesId}/reviews/me`);
      return data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) return null;
      throw err;
    }
  },
};

function invalidate(qc: ReturnType<typeof useQueryClient>, seriesId?: number) {
  if (seriesId !== undefined) {
    qc.invalidateQueries({ queryKey: ["series-reviews", "series", seriesId] });
    qc.invalidateQueries({ queryKey: ["series-reviews", "stats", seriesId] });
    qc.invalidateQueries({ queryKey: ["my-review", "series", seriesId] });
  } else {
    qc.invalidateQueries({ queryKey: ["series-reviews"] });
    qc.invalidateQueries({ queryKey: ["my-review", "series"] });
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
    onSuccess: (newReview) => {
      qc.setQueryData(["my-review", "series", seriesId], newReview);
      invalidate(qc, seriesId);
    },
  });
}

export function useUpdateSeriesReview(reviewId: number, seriesId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReviewRequest) => seriesReviewsService.update(reviewId, payload),
    onSuccess: (updated) => {
      qc.setQueryData(["my-review", "series", seriesId], updated);
      invalidate(qc, seriesId);
    },
  });
}

export function useDeleteSeriesReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: number) => seriesReviewsService.remove(reviewId),
    onSuccess: () => invalidate(qc),
  });
}

export function useMySeriesReview(seriesId: number) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["my-review", "series", seriesId],
    queryFn: () => seriesReviewsService.myReview(seriesId),
    enabled: accessToken !== null && Number.isFinite(seriesId),
    staleTime: 30_000,
  });
}

export function useUpsertSeriesRating(seriesId: number) {
  const qc = useQueryClient();
  const t = useTranslate();
  return useMutation({
    mutationFn: async (rating: number) => {
      const existing = qc.getQueryData<{ id: number; comment: string | null } | null>([
        "my-review",
        "series",
        seriesId,
      ]);
      if (existing) {
        const updated = await seriesReviewsService.update(existing.id, { rating, comment: existing.comment });
        return { review: updated, wasUpdate: true };
      }
      const created = await seriesReviewsService.create(seriesId, { rating, comment: null });
      return { review: created, wasUpdate: false };
    },
    onSuccess: (data) => {
      qc.setQueryData(["my-review", "series", seriesId], data.review);
      invalidate(qc, seriesId);
      toast.success(data.wasUpdate ? t("toasts.ratingUpdated") : t("toasts.ratingSaved"));
    },
    onError: () => {
      toast.error(t("toasts.ratingError"));
    },
  });
}

export function useRemoveSeriesRating(seriesId: number) {
  const qc = useQueryClient();
  const t = useTranslate();
  return useMutation({
    mutationFn: async () => {
      const existing = qc.getQueryData<{ id: number } | null>([
        "my-review",
        "series",
        seriesId,
      ]);
      if (!existing) return;
      await seriesReviewsService.remove(existing.id);
    },
    onSuccess: () => {
      qc.setQueryData(["my-review", "series", seriesId], null);
      invalidate(qc, seriesId);
      toast.success(t("toasts.ratingRemoved"));
    },
    onError: () => {
      toast.error(t("toasts.ratingError"));
    },
  });
}
