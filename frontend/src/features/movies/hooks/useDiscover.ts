import { useQuery } from "@tanstack/react-query";
import { moviesService } from "@/features/movies/services/movies.service";

export function useTrending(limit = 10) {
  return useQuery({
    queryKey: ["movies", "trending", limit],
    queryFn: () => moviesService.trending(limit),
    staleTime: 5 * 60_000,
  });
}

export function useTopRated(limit = 10, minReviews = 3) {
  return useQuery({
    queryKey: ["movies", "top-rated", limit, minReviews],
    queryFn: () => moviesService.topRated(limit, minReviews),
    staleTime: 5 * 60_000,
  });
}

export function useSimilar(movieId: number | null, limit = 8) {
  return useQuery({
    queryKey: ["movies", "similar", movieId, limit],
    queryFn: () => moviesService.similar(movieId as number, limit),
    enabled: movieId !== null && Number.isFinite(movieId),
    staleTime: 5 * 60_000,
  });
}
