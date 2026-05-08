import { api } from "@/lib/api";
import type {
  Series,
  SeriesPage,
  SeriesRequest,
  SeriesSearchParams,
  TmdbTvView,
} from "@/types/series";

export const seriesService = {
  async search(params: SeriesSearchParams): Promise<SeriesPage> {
    const { data } = await api.get<SeriesPage>("/series", { params });
    return data;
  },

  async findById(id: number): Promise<Series> {
    const { data } = await api.get<Series>(`/series/${id}`);
    return data;
  },

  async similar(id: number, limit = 8): Promise<Series[]> {
    const { data } = await api.get<Series[]>(`/series/${id}/similar`, {
      params: { limit },
    });
    return data;
  },

  async create(payload: SeriesRequest): Promise<Series> {
    const { data } = await api.post<Series>("/series", payload);
    return data;
  },

  async update(id: number, payload: SeriesRequest): Promise<Series> {
    const { data } = await api.put<Series>(`/series/${id}`, payload);
    return data;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/series/${id}`);
  },

  // TMDB
  async tmdbSearch(query: string): Promise<TmdbTvView[]> {
    const { data } = await api.get<TmdbTvView[]>("/admin/tmdb/tv/search", {
      params: { query },
    });
    return data;
  },

  async tmdbPopular(): Promise<TmdbTvView[]> {
    const { data } = await api.get<TmdbTvView[]>("/admin/tmdb/tv/popular");
    return data;
  },

  async tmdbImport(tmdbId: number): Promise<Series> {
    const { data } = await api.post<Series>(`/admin/tmdb/tv/import/${tmdbId}`);
    return data;
  },
};
