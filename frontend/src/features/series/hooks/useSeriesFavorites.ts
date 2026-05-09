import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { FavoriteCheck } from "@/types/favorite";
import type { Series, SeriesPage } from "@/types/series";

export const seriesFavoritesService = {
  async myFavorites(page = 0, size = 20): Promise<SeriesPage> {
    const { data } = await api.get<SeriesPage>("/users/me/series-favorites", {
      params: { page, size },
    });
    return data;
  },
  async isFavorite(seriesId: number): Promise<boolean> {
    const { data } = await api.get<FavoriteCheck>(`/users/me/series-favorites/${seriesId}`);
    return data.favorite;
  },
  async add(seriesId: number): Promise<void> {
    await api.post(`/users/me/series-favorites/${seriesId}`);
  },
  async remove(seriesId: number): Promise<void> {
    await api.delete(`/users/me/series-favorites/${seriesId}`);
  },
};

export function useMySeriesFavorites(page = 0, size = 20) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["series-favorites", "me", page, size],
    queryFn: () => seriesFavoritesService.myFavorites(page, size),
    placeholderData: keepPreviousData,
    enabled: accessToken !== null,
  });
}

export function useIsSeriesFavorite(seriesId: number) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["series-favorite", seriesId],
    queryFn: () => seriesFavoritesService.isFavorite(seriesId),
    enabled: accessToken !== null && Number.isFinite(seriesId),
    staleTime: 60_000,
  });
}

export function useToggleSeriesFavorite(seriesId: number) {
  const qc = useQueryClient();
  const key = ["series-favorite", seriesId];

  return useMutation({
    mutationFn: async (isFavoriteNow: boolean) => {
      if (isFavoriteNow) {
        await seriesFavoritesService.remove(seriesId);
        return false;
      }
      await seriesFavoritesService.add(seriesId);
      return true;
    },
    onMutate: async (isFavoriteNow: boolean) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<boolean>(key);
      qc.setQueryData(key, !isFavoriteNow);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(key, ctx?.prev);
      toast.error("Could not update favorite");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["series-favorites", "me"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      qc.invalidateQueries({ queryKey: ["series", "trending"] });
    },
  });
}

// Series passed via favorites list — useful for profile tab.
export type { Series };
