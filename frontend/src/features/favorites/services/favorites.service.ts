import { api } from "@/lib/api";
import type { FavoriteCheck, FavoritesPage } from "@/types/favorite";

export const favoritesService = {
  async myFavorites(page = 0, size = 20): Promise<FavoritesPage> {
    const { data } = await api.get<FavoritesPage>("/users/me/favorites", {
      params: { page, size },
    });
    return data;
  },

  async isFavorite(movieId: number): Promise<boolean> {
    const { data } = await api.get<FavoriteCheck>(`/users/me/favorites/${movieId}`);
    return data.favorite;
  },

  async add(movieId: number): Promise<void> {
    await api.post(`/users/me/favorites/${movieId}`);
  },

  async remove(movieId: number): Promise<void> {
    await api.delete(`/users/me/favorites/${movieId}`);
  },
};
