import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { moviesService } from "@/features/movies/services/movies.service";
import type { MovieRequest } from "@/types/movie";

/**
 * Invalidate only the catalog-listing variants of the movies query tree.
 * Previously we invalidated the wildcard `["movies"]` key, which forced a
 * refetch of every item-detail, trending, top-rated, similar, infinite,
 * and admin TMDB query. After a create/update/delete the only views that
 * truly need a refresh are the lists; item-detail is patched via
 * setQueryData below.
 */
function invalidateMovieLists(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["movies", "infinite"] });
  qc.invalidateQueries({ queryKey: ["movies", "trending"] });
  qc.invalidateQueries({ queryKey: ["movies", "top-rated"] });
  qc.invalidateQueries({ queryKey: ["movies", "similar"] });
  qc.invalidateQueries({ queryKey: ["admin", "stats"] });
}

export function useCreateMovie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MovieRequest) => moviesService.create(payload),
    onSuccess: () => invalidateMovieLists(qc),
  });
}

export function useUpdateMovie(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MovieRequest) => moviesService.update(id, payload),
    onSuccess: (data) => {
      qc.setQueryData(["movie", id], data);
      invalidateMovieLists(qc);
    },
  });
}

export function useDeleteMovie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => moviesService.remove(id),
    onSuccess: (_d, id) => {
      qc.removeQueries({ queryKey: ["movie", id] });
      invalidateMovieLists(qc);
    },
  });
}
