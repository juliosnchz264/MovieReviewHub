import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Series } from "@/types/series";

const seriesDiscover = {
  async trending(limit = 10): Promise<Series[]> {
    const { data } = await api.get<Series[]>("/series/trending", { params: { limit } });
    return data;
  },
  async topRated(limit = 10, minReviews = 1): Promise<Series[]> {
    const { data } = await api.get<Series[]>("/series/top-rated", {
      params: { limit, minReviews },
    });
    return data;
  },
};

export function useTrendingSeries(limit = 10) {
  return useQuery({
    queryKey: ["series", "trending", limit],
    queryFn: () => seriesDiscover.trending(limit),
    staleTime: 5 * 60_000,
  });
}

export function useTopRatedSeries(limit = 10, minReviews = 1) {
  return useQuery({
    queryKey: ["series", "top-rated", limit, minReviews],
    queryFn: () => seriesDiscover.topRated(limit, minReviews),
    staleTime: 5 * 60_000,
  });
}
