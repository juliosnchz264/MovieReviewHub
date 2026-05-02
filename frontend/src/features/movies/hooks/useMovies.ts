import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { moviesService } from "@/features/movies/services/movies.service";
import type { MovieSearchParams } from "@/types/movie";

export function useMovies(params: MovieSearchParams) {
  return useQuery({
    queryKey: ["movies", params],
    queryFn: () => moviesService.search(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
