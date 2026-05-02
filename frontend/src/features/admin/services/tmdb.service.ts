import { api } from "@/lib/api";
import type { Movie } from "@/types/movie";
import type { TmdbMovieView } from "@/types/tmdb";

export const tmdbService = {
  async search(query: string): Promise<TmdbMovieView[]> {
    const { data } = await api.get<TmdbMovieView[]>("/admin/tmdb/search", {
      params: { query },
    });
    return data;
  },

  async popular(): Promise<TmdbMovieView[]> {
    const { data } = await api.get<TmdbMovieView[]>("/admin/tmdb/popular");
    return data;
  },

  async importMovie(tmdbId: number): Promise<Movie> {
    const { data } = await api.post<Movie>(`/admin/tmdb/import/${tmdbId}`);
    return data;
  },
};
