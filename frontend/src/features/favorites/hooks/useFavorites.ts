import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { favoritesService } from "@/features/favorites/services/favorites.service";
import { useAuthStore } from "@/store/auth";

export function useMyFavorites(page = 0, size = 20) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["favorites", "me", page, size],
    queryFn: () => favoritesService.myFavorites(page, size),
    placeholderData: keepPreviousData,
    enabled: accessToken !== null,
  });
}

export function useIsFavorite(movieId: number) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["favorite", movieId],
    queryFn: () => favoritesService.isFavorite(movieId),
    enabled: accessToken !== null && Number.isFinite(movieId),
    staleTime: 60_000,
  });
}

export function useToggleFavorite(movieId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (isFavoriteNow: boolean) => {
      if (isFavoriteNow) {
        await favoritesService.remove(movieId);
        return false;
      }
      await favoritesService.add(movieId);
      return true;
    },
    onSuccess: (newValue) => {
      qc.setQueryData(["favorite", movieId], newValue);
      qc.invalidateQueries({ queryKey: ["favorites", "me"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}
