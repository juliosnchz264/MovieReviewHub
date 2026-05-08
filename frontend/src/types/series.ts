import type { PagedResponse } from "./movie";

export interface Series {
  id: number;
  title: string;
  description: string | null;
  genres: string[];
  imageUrl: string | null;
  firstAirDate: string | null;
  lastAirDate: string | null;
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SeriesRequest {
  title: string;
  description?: string | null;
  genres?: string[];
  imageUrl?: string | null;
  firstAirDate?: string | null;
  lastAirDate?: string | null;
  numberOfSeasons?: number | null;
  numberOfEpisodes?: number | null;
}

export interface SeriesSearchParams {
  title?: string;
  genre?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export type SeriesPage = PagedResponse<Series>;

export interface TmdbTvView {
  tmdbId: number;
  title: string;
  overview: string | null;
  posterUrl: string | null;
  firstAirDate: string | null;
  lastAirDate: string | null;
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  genres: string[];
  voteAverage: number | null;
  voteCount: number | null;
  alreadyImported: boolean;
  localSeriesId: number | null;
}
