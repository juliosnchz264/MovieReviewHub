import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { reviewsService } from "@/features/reviews/services/reviews.service";
import { reviewKeys } from "@/features/reviews/hooks/queryKeys";
import { useAuthStore } from "@/store/auth";
import { useTranslate } from "@/hooks/useTranslate";
import type { ReviewRequest } from "@/types/review";

const KIND = "movie" as const;

export function useMovieReviews(movieId: number, page = 0, size = 20) {
  return useQuery({
    queryKey: reviewKeys.list(KIND, movieId, page, size),
    queryFn: () => reviewsService.findByMovie(movieId, page, size),
    placeholderData: keepPreviousData,
    enabled: Number.isFinite(movieId),
  });
}

export function useRatingStats(movieId: number) {
  return useQuery({
    queryKey: reviewKeys.stats(KIND, movieId),
    queryFn: () => reviewsService.getStats(movieId),
    enabled: Number.isFinite(movieId),
  });
}

export function useMyReviews(page = 0, size = 20) {
  return useQuery({
    queryKey: reviewKeys.meList(KIND, page, size),
    queryFn: () => reviewsService.myReviews(page, size),
    placeholderData: keepPreviousData,
  });
}

/**
 * Broad invalidation across all movie-review caches (lists, sections, feeds,
 * details, stats, my-review, admin views). A single mutation touches enough
 * downstream views (popular ranking shifts, stats recompute) that scoping
 * finer than this is more bug surface than savings — React Query only
 * refetches *active* queries anyway.
 */
function invalidateReviewQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: reviewKeys.byKind(KIND) });
  qc.invalidateQueries({ queryKey: reviewKeys.myReviewByKind(KIND) });
  qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
  qc.invalidateQueries({ queryKey: ["admin", "stats"] });
}

export function useCreateReview(movieId: number) {
  const qc = useQueryClient();
  const t = useTranslate();
  return useMutation({
    mutationFn: (payload: ReviewRequest) => reviewsService.create(movieId, payload),
    onSuccess: (newReview) => {
      // Server is source of truth — overwrite the optional myReview cache so
      // the detail view immediately hides the "leave a review" form.
      qc.setQueryData(reviewKeys.myReview(KIND, movieId), newReview);
      invalidateReviewQueries(qc);
      toast.success(t("toasts.reviewCreated"));
    },
    onError: () => {
      toast.error(t("toasts.reviewCreateError"));
    },
  });
}

export function useUpdateReview(reviewId: number, movieId: number) {
  const qc = useQueryClient();
  const t = useTranslate();
  return useMutation({
    mutationFn: (payload: ReviewRequest) => reviewsService.update(reviewId, payload),
    onSuccess: (updated) => {
      qc.setQueryData(reviewKeys.myReview(KIND, movieId), updated);
      invalidateReviewQueries(qc);
      toast.success(t("toasts.reviewUpdated"));
    },
    onError: () => {
      toast.error(t("toasts.reviewUpdateError"));
    },
  });
}

/**
 * Delete with optimistic removal from "my review" cache so the form
 * reappears instantly. Sections/feed/list refetch on settled — the deleted
 * review disappears from the list without any visible "stale → empty" flash
 * because the soft-deleted row is excluded server-side from those queries.
 */
export function useDeleteReview(movieId?: number) {
  const qc = useQueryClient();
  const t = useTranslate();
  return useMutation({
    mutationFn: (reviewId: number) => reviewsService.remove(reviewId),
    onMutate: async () => {
      if (movieId === undefined) return undefined;
      await qc.cancelQueries({ queryKey: reviewKeys.myReview(KIND, movieId) });
      const previous = qc.getQueryData(reviewKeys.myReview(KIND, movieId));
      qc.setQueryData(reviewKeys.myReview(KIND, movieId), null);
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (movieId !== undefined && ctx && "previous" in ctx) {
        qc.setQueryData(reviewKeys.myReview(KIND, movieId), ctx.previous);
      }
      toast.error(t("toasts.reviewDeleteError"));
    },
    onSuccess: () => {
      toast.success(t("toasts.reviewDeleted"));
    },
    onSettled: () => {
      invalidateReviewQueries(qc);
    },
  });
}

export function useMyMovieReview(movieId: number) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: reviewKeys.myReview(KIND, movieId),
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
      const existing = qc.getQueryData<{ id: number; comment: string | null } | null>(
        reviewKeys.myReview(KIND, movieId)
      );
      if (existing) {
        const updated = await reviewsService.update(existing.id, { rating, comment: existing.comment });
        return { review: updated, wasUpdate: true };
      }
      const created = await reviewsService.create(movieId, { rating, comment: null });
      return { review: created, wasUpdate: false };
    },
    onSuccess: (data) => {
      qc.setQueryData(reviewKeys.myReview(KIND, movieId), data.review);
      invalidateReviewQueries(qc);
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
      const existing = qc.getQueryData<{ id: number } | null>(reviewKeys.myReview(KIND, movieId));
      if (!existing) return;
      await reviewsService.remove(existing.id);
    },
    onSuccess: () => {
      qc.setQueryData(reviewKeys.myReview(KIND, movieId), null);
      invalidateReviewQueries(qc);
      toast.success(t("toasts.ratingRemoved"));
    },
    onError: () => {
      toast.error(t("toasts.ratingError"));
    },
  });
}
