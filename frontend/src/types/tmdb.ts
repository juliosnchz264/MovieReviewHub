export interface TmdbMovieView {
  tmdbId: number;
  title: string;
  overview: string | null;
  posterUrl: string | null;
  releaseDate: string | null;
  genres: string[];
  voteAverage: number | null;
  voteCount: number | null;
  alreadyImported: boolean;
  localMovieId: number | null;
}
