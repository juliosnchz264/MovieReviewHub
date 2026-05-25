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
import { reviewKeys } from "@/features/reviews/hooks/queryKeys";
import type { PagedResponse } from "@/types/movie";
import type { MovieRatingStats, ReviewRequest } from "@/types/review";

const KIND = "series" as const;

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
    // Backend returns 200 with a null body when the user has not reviewed.
    const { data } = await api.get<SeriesReview | null>(`/series/${seriesId}/reviews/me`);
    return data ?? null;
  },
};

/**
 * Broad invalidation across series-review caches. Sections, feeds, details
 * and stats share the same ["reviews", "series", …] prefix as movies, so a
 * single byKind invalidation refreshes every consumer.
 */
function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: reviewKeys.byKind(KIND) });
  qc.invalidateQueries({ queryKey: reviewKeys.myReviewByKind(KIND) });
  qc.invalidateQueries({ queryKey: ["series", "trending"] });
  qc.invalidateQueries({ queryKey: ["series", "top-rated"] });
  qc.invalidateQueries({ queryKey: ["admin", "stats"] });
}

export function useSeriesReviews(seriesId: number, page = 0, size = 20) {
  return useQuery({
    queryKey: reviewKeys.list(KIND, seriesId, page, size),
    queryFn: () => seriesReviewsService.findBySeries(seriesId, page, size),
    placeholderData: keepPreviousData,
    enabled: Number.isFinite(seriesId),
  });
}

export function useSeriesRatingStats(seriesId: number) {
  return useQuery({
    queryKey: reviewKeys.stats(KIND, seriesId),
    queryFn: () => seriesReviewsService.getStats(seriesId),
    enabled: Number.isFinite(seriesId),
  });
}

export function useMySeriesReviews(page = 0, size = 20) {
  return useQuery({
    queryKey: reviewKeys.meList(KIND, page, size),
    queryFn: () => seriesReviewsService.myReviews(page, size),
    placeholderData: keepPreviousData,
  });
}

export function useCreateSeriesReview(seriesId: number) {
  const qc = useQueryClient();
  const t = useTranslate();
  return useMutation({
    mutationFn: (payload: ReviewRequest) => seriesReviewsService.create(seriesId, payload),
    onSuccess: (newReview) => {
      qc.setQueryData(reviewKeys.myReview(KIND, seriesId), newReview);
      invalidate(qc);
      toast.success(t("toasts.reviewCreated"));
    },
    onError: () => {
      toast.error(t("toasts.reviewCreateError"));
    },
  });
}

export function useUpdateSeriesReview(reviewId: number, seriesId: number) {
  const qc = useQueryClient();
  const t = useTranslate();
  return useMutation({
    mutationFn: (payload: ReviewRequest) => seriesReviewsService.update(reviewId, payload),
    onSuccess: (updated) => {
      qc.setQueryData(reviewKeys.myReview(KIND, seriesId), updated);
      invalidate(qc);
      toast.success(t("toasts.reviewUpdated"));
    },
    onError: () => {
      toast.error(t("toasts.reviewUpdateError"));
    },
  });
}

export function useDeleteSeriesReview(seriesId?: number) {
  const qc = useQueryClient();
  const t = useTranslate();
  return useMutation({
    mutationFn: (reviewId: number) => seriesReviewsService.remove(reviewId),
    onMutate: async () => {
      if (seriesId === undefined) return undefined;
      await qc.cancelQueries({ queryKey: reviewKeys.myReview(KIND, seriesId) });
      const previous = qc.getQueryData(reviewKeys.myReview(KIND, seriesId));
      qc.setQueryData(reviewKeys.myReview(KIND, seriesId), null);
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (seriesId !== undefined && ctx && "previous" in ctx) {
        qc.setQueryData(reviewKeys.myReview(KIND, seriesId), ctx.previous);
      }
      toast.error(t("toasts.reviewDeleteError"));
    },
    onSuccess: () => {
      toast.success(t("toasts.reviewDeleted"));
    },
    onSettled: () => {
      invalidate(qc);
    },
  });
}

export function useMySeriesReview(seriesId: number) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: reviewKeys.myReview(KIND, seriesId),
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
      const existing = qc.getQueryData<{ id: number; comment: string | null } | null>(
        reviewKeys.myReview(KIND, seriesId)
      );
      if (existing) {
        const updated = await seriesReviewsService.update(existing.id, { rating, comment: existing.comment });
        return { review: updated, wasUpdate: true };
      }
      const created = await seriesReviewsService.create(seriesId, { rating, comment: null });
      return { review: created, wasUpdate: false };
    },
    onSuccess: (data) => {
      qc.setQueryData(reviewKeys.myReview(KIND, seriesId), data.review);
      invalidate(qc);
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
      const existing = qc.getQueryData<{ id: number } | null>(reviewKeys.myReview(KIND, seriesId));
      if (!existing) return;
      await seriesReviewsService.remove(existing.id);
    },
    onSuccess: () => {
      qc.setQueryData(reviewKeys.myReview(KIND, seriesId), null);
      invalidate(qc);
      toast.success(t("toasts.ratingRemoved"));
    },
    onError: () => {
      toast.error(t("toasts.ratingError"));
    },
  });
}
