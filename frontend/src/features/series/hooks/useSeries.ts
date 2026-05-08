import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { seriesService } from "@/features/series/services/series.service";
import type { SeriesRequest, SeriesSearchParams } from "@/types/series";

const PAGE_SIZE = 12;

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["series"] });
  qc.invalidateQueries({ queryKey: ["admin", "stats"] });
}

export function useInfiniteSeries(filters: Pick<SeriesSearchParams, "title" | "genre">) {
  return useInfiniteQuery({
    queryKey: ["series", "infinite", filters],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      seriesService.search({
        ...filters,
        page: pageParam,
        size: PAGE_SIZE,
        sort: "firstAirDate,desc",
      }),
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.page + 1),
  });
}

export function useSeriesPaginated(params: SeriesSearchParams) {
  return useQuery({
    queryKey: ["series", params],
    queryFn: () => seriesService.search(params),
    placeholderData: keepPreviousData,
  });
}

export function useSeriesItem(id: number | null) {
  return useQuery({
    queryKey: ["series", "item", id],
    queryFn: () => seriesService.findById(id as number),
    enabled: id !== null && Number.isFinite(id),
  });
}

export function useSimilarSeries(id: number | null, limit = 8) {
  return useQuery({
    queryKey: ["series", "similar", id, limit],
    queryFn: () => seriesService.similar(id as number, limit),
    enabled: id !== null && Number.isFinite(id),
    staleTime: 5 * 60_000,
  });
}

export function useCreateSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SeriesRequest) => seriesService.create(payload),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateSeries(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SeriesRequest) => seriesService.update(id, payload),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => seriesService.remove(id),
    onSuccess: () => invalidate(qc),
  });
}

// TMDB
export function useTmdbTvSearch(query: string) {
  return useQuery({
    queryKey: ["tmdb", "tv", "search", query],
    queryFn: () => seriesService.tmdbSearch(query),
    enabled: query.length >= 2,
    staleTime: 60_000,
  });
}

export function useTmdbTvPopular(enabled = true) {
  return useQuery({
    queryKey: ["tmdb", "tv", "popular"],
    queryFn: () => seriesService.tmdbPopular(),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useImportTmdbSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tmdbId: number) => seriesService.tmdbImport(tmdbId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tmdb", "tv"] });
      invalidate(qc);
    },
  });
}
