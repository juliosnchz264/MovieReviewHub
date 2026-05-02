import { useQuery } from "@tanstack/react-query";
import { moviesService } from "@/features/movies/services/movies.service";

export function useMovie(id: number | null) {
  return useQuery({
    queryKey: ["movie", id],
    queryFn: () => moviesService.findById(id as number),
    enabled: id !== null,
  });
}
