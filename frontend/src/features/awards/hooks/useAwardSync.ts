import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface AwardSyncItem {
  tmdbId: number;
  mediaType: "movie" | "tv";
}

export interface AwardSyncResult {
  imported: { movies: number; series: number };
  skipped: { movies: number; series: number };
  failed: Array<{ tmdbId: number; mediaType: string; error: string }>;
  mapping: { movies: Record<string, number>; series: Record<string, number> };
}

export function useAwardSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: AwardSyncItem[]) => {
      const { data } = await api.post<AwardSyncResult>(
        "/admin/tmdb/awards/sync",
        { items }
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["awards"] });
    },
  });
}
