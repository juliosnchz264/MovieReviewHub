import { useQuery } from "@tanstack/react-query";
import { castService } from "@/features/cast/services/cast.service";

const STALE_MS = 30 * 60_000;

export function useMovieCast(movieId: number | undefined, limit = 10) {
  return useQuery({
    queryKey: ["cast", "movie", movieId, limit],
    queryFn: () => castService.movieCast(movieId as number, limit),
    enabled: Number.isFinite(movieId),
    staleTime: STALE_MS,
  });
}

export function useSeriesCast(seriesId: number | undefined, limit = 10) {
  return useQuery({
    queryKey: ["cast", "series", seriesId, limit],
    queryFn: () => castService.seriesCast(seriesId as number, limit),
    enabled: Number.isFinite(seriesId),
    staleTime: STALE_MS,
  });
}
