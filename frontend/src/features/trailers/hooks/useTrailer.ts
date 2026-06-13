import { useQuery } from "@tanstack/react-query";
import { trailerService } from "@/features/trailers/services/trailer.service";

const STALE_MS = 60 * 60_000;

export function useMovieTrailer(movieId: number | undefined) {
  return useQuery({
    queryKey: ["trailer", "movie", movieId],
    queryFn: () => trailerService.movieTrailer(movieId as number),
    enabled: Number.isFinite(movieId),
    staleTime: STALE_MS,
    retry: 1,
  });
}

export function useSeriesTrailer(seriesId: number | undefined) {
  return useQuery({
    queryKey: ["trailer", "series", seriesId],
    queryFn: () => trailerService.seriesTrailer(seriesId as number),
    enabled: Number.isFinite(seriesId),
    staleTime: STALE_MS,
    retry: 1,
  });
}
