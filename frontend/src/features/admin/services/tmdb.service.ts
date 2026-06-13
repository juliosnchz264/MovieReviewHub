import { api } from "@/lib/api";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";
import type { TmdbMovieView } from "@/types/tmdb";

export interface GenreRefreshResult {
  updated: number;
  skipped: number;
  failed: number;
}

export interface AutoLinkResult {
  linked: number;
  skipped: number;
  failures: { localId: number; title: string; reason: string }[];
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

  async refreshBackdrops(): Promise<GenreRefreshResult> {
    const { data } = await api.post<GenreRefreshResult>(
      "/admin/tmdb/refresh-backdrops"
    );
    return data;
  },

  async linkMovie(movieId: number, tmdbId: number): Promise<Movie> {
    const { data } = await api.post<Movie>(
      `/admin/tmdb/link/movie/${movieId}`,
      null,
      { params: { tmdbId } }
    );
    return data;
  },

  async linkSeries(seriesId: number, tmdbId: number): Promise<Series> {
    const { data } = await api.post<Series>(
      `/admin/tmdb/link/series/${seriesId}`,
      null,
      { params: { tmdbId } }
    );
    return data;
  },

  async autoLinkMovies(): Promise<AutoLinkResult> {
    const { data } = await api.post<AutoLinkResult>("/admin/tmdb/auto-link/movies");
    return data;
  },

  async autoLinkSeries(): Promise<AutoLinkResult> {
    const { data } = await api.post<AutoLinkResult>("/admin/tmdb/auto-link/series");
    return data;
  },
};
