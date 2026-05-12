import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { favoritesService } from "@/features/favorites/services/favorites.service";
import { useAuthStore } from "@/store/auth";
import { useTranslate } from "@/hooks/useTranslate";

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
  const t = useTranslate();
  const key = ["favorite", movieId];

  return useMutation({
    mutationFn: async (isFavoriteNow: boolean) => {
      if (isFavoriteNow) {
        await favoritesService.remove(movieId);
        return false;
      }
      await favoritesService.add(movieId);
      return true;
    },
    onMutate: async (isFavoriteNow: boolean) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<boolean>(key);
      qc.setQueryData(key, !isFavoriteNow);
      return { prev };
    },
    onSuccess: (added) => {
      toast.success(added ? t("toasts.favoriteAdded") : t("toasts.favoriteRemoved"));
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(key, ctx?.prev);
      toast.error(t("toasts.favoriteError"));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["favorites", "me"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}
