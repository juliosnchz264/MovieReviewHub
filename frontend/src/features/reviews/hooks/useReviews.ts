import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { reviewsService } from "@/features/reviews/services/reviews.service";
import { useAuthStore } from "@/store/auth";
import { useTranslate } from "@/hooks/useTranslate";
import type { ReviewRequest } from "@/types/review";

export function useMovieReviews(movieId: number, page = 0, size = 20) {
  return useQuery({
    queryKey: ["reviews", "movie", movieId, page, size],
    queryFn: () => reviewsService.findByMovie(movieId, page, size),
    placeholderData: keepPreviousData,
    enabled: Number.isFinite(movieId),
  });
}

export function useRatingStats(movieId: number) {
  return useQuery({
    queryKey: ["reviews", "stats", movieId],
    queryFn: () => reviewsService.getStats(movieId),
    enabled: Number.isFinite(movieId),
  });
}

export function useMyReviews(page = 0, size = 20) {
  return useQuery({
    queryKey: ["reviews", "me", page, size],
    queryFn: () => reviewsService.myReviews(page, size),
    placeholderData: keepPreviousData,
  });
}

function invalidateReviewQueries(qc: ReturnType<typeof useQueryClient>, movieId?: number) {
  if (movieId !== undefined) {
    qc.invalidateQueries({ queryKey: ["reviews", "movie", movieId] });
    qc.invalidateQueries({ queryKey: ["reviews", "stats", movieId] });
    qc.invalidateQueries({ queryKey: ["my-review", "movie", movieId] });
  } else {
    qc.invalidateQueries({ queryKey: ["reviews"] });
    qc.invalidateQueries({ queryKey: ["my-review", "movie"] });
  }
  qc.invalidateQueries({ queryKey: ["reviews", "me"] });
  qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
  qc.invalidateQueries({ queryKey: ["admin", "stats"] });
}

export function useCreateReview(movieId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReviewRequest) => reviewsService.create(movieId, payload),
    onSuccess: (newReview) => {
      qc.setQueryData(["my-review", "movie", movieId], newReview);
      invalidateReviewQueries(qc, movieId);
    },
  });
}

export function useUpdateReview(reviewId: number, movieId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReviewRequest) => reviewsService.update(reviewId, payload),
    onSuccess: (updated) => {
      qc.setQueryData(["my-review", "movie", movieId], updated);
      invalidateReviewQueries(qc, movieId);
    },
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: number) => reviewsService.remove(reviewId),
    onSuccess: () => invalidateReviewQueries(qc),
  });
}

export function useMyMovieReview(movieId: number) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["my-review", "movie", movieId],
    queryFn: () => reviewsService.myReview(movieId),
    enabled: accessToken !== null && Number.isFinite(movieId),
    staleTime: 30_000,
  });
}

export function useUpsertMovieRating(movieId: number) {
  const qc = useQueryClient();
  const t = useTranslate();
  return useMutation({
    mutationFn: async (rating: number) => {
      const existing = qc.getQueryData<{ id: number; comment: string | null } | null>([
        "my-review",
        "movie",
        movieId,
      ]);
      if (existing) {
        const updated = await reviewsService.update(existing.id, { rating, comment: existing.comment });
        return { review: updated, wasUpdate: true };
      }
      const created = await reviewsService.create(movieId, { rating, comment: null });
      return { review: created, wasUpdate: false };
    },
    onSuccess: (data) => {
      qc.setQueryData(["my-review", "movie", movieId], data.review);
      invalidateReviewQueries(qc, movieId);
      toast.success(data.wasUpdate ? t("toasts.ratingUpdated") : t("toasts.ratingSaved"));
    },
    onError: () => {
      toast.error(t("toasts.ratingError"));
    },
  });
}

export function useRemoveMovieRating(movieId: number) {
  const qc = useQueryClient();
  const t = useTranslate();
  return useMutation({
    mutationFn: async () => {
      const existing = qc.getQueryData<{ id: number } | null>([
        "my-review",
        "movie",
        movieId,
      ]);
      if (!existing) return;
      await reviewsService.remove(existing.id);
    },
    onSuccess: () => {
      qc.setQueryData(["my-review", "movie", movieId], null);
      invalidateReviewQueries(qc, movieId);
      toast.success(t("toasts.ratingRemoved"));
    },
    onError: () => {
      toast.error(t("toasts.ratingError"));
    },
  });
}
