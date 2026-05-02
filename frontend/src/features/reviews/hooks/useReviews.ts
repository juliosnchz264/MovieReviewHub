import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { reviewsService } from "@/features/reviews/services/reviews.service";
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
  } else {
    qc.invalidateQueries({ queryKey: ["reviews"] });
  }
  qc.invalidateQueries({ queryKey: ["reviews", "me"] });
  qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
  qc.invalidateQueries({ queryKey: ["admin", "stats"] });
}

export function useCreateReview(movieId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReviewRequest) => reviewsService.create(movieId, payload),
    onSuccess: () => invalidateReviewQueries(qc, movieId),
  });
}

export function useUpdateReview(reviewId: number, movieId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReviewRequest) => reviewsService.update(reviewId, payload),
    onSuccess: () => invalidateReviewQueries(qc, movieId),
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: number) => reviewsService.remove(reviewId),
    onSuccess: () => invalidateReviewQueries(qc),
  });
}
