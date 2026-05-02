import { useInfiniteQuery } from "@tanstack/react-query";
import { moviesService } from "@/features/movies/services/movies.service";
import type { MovieSearchParams } from "@/types/movie";

const PAGE_SIZE = 12;

export function useInfiniteMovies(filters: Pick<MovieSearchParams, "title" | "genre">) {
  return useInfiniteQuery({
    queryKey: ["movies", "infinite", filters],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      moviesService.search({
        ...filters,
        page: pageParam,
        size: PAGE_SIZE,
        sort: "releaseDate,desc",
      }),
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.page + 1),
  });
}
