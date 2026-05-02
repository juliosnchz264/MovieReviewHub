import { useMutation, useQueryClient } from "@tanstack/react-query";
import { moviesService } from "@/features/movies/services/movies.service";
import type { MovieRequest } from "@/types/movie";

function invalidateMovieQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["movies"] });
  qc.invalidateQueries({ queryKey: ["admin", "stats"] });
}

export function useCreateMovie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MovieRequest) => moviesService.create(payload),
    onSuccess: () => invalidateMovieQueries(qc),
  });
}

export function useUpdateMovie(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MovieRequest) => moviesService.update(id, payload),
    onSuccess: (data) => {
      invalidateMovieQueries(qc);
      qc.setQueryData(["movie", id], data);
    },
  });
}

export function useDeleteMovie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => moviesService.remove(id),
    onSuccess: () => invalidateMovieQueries(qc),
  });
}
