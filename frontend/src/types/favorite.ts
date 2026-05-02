import type { Movie, PagedResponse } from "./movie";

export type FavoritesPage = PagedResponse<Movie>;

export interface FavoriteCheck {
  favorite: boolean;
}
