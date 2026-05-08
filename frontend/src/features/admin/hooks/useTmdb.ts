import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tmdbService } from "@/features/admin/services/tmdb.service";

export function useTmdbSearch(query: string) {
  return useQuery({
    queryKey: ["tmdb", "search", query],
    queryFn: () => tmdbService.search(query),
    enabled: query.length >= 2,
    staleTime: 60_000,
  });
}

export function useTmdbPopular(enabled = true) {
  return useQuery({
    queryKey: ["tmdb", "popular"],
    queryFn: () => tmdbService.popular(),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useImportTmdbMovie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tmdbId: number) => tmdbService.importMovie(tmdbId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tmdb"] });
      qc.invalidateQueries({ queryKey: ["movies"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

export function useRefreshMovieGenres() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => tmdbService.refreshMovieGenres(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["movies"] });
    },
  });
}

export function useRefreshSeriesGenres() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => tmdbService.refreshSeriesGenres(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["series"] });
    },
  });
}
