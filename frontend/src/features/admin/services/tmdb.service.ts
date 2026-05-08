import { api } from "@/lib/api";
import type { Movie } from "@/types/movie";
import type { TmdbMovieView } from "@/types/tmdb";

export interface GenreRefreshResult {
  updated: number;
  skipped: number;
  failed: number;
}

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

  async refreshMovieGenres(): Promise<GenreRefreshResult> {
    const { data } = await api.post<GenreRefreshResult>(
      "/admin/tmdb/refresh-genres/movies"
    );
    return data;
  },

  async refreshSeriesGenres(): Promise<GenreRefreshResult> {
    const { data } = await api.post<GenreRefreshResult>(
      "/admin/tmdb/refresh-genres/series"
    );
    return data;
  },
};
