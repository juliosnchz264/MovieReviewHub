"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { listsService } from "@/features/lists/services/lists.service";
import { useMyLists } from "@/features/lists/hooks/useLists";
import type { ListItem, ListItemKind } from "@/types/list";

interface UseMyWatchlistResult {
  isLoading: boolean;
  items: ListItem[];
  movies: ListItem[];
  series: ListItem[];
  movieCount: number;
  seriesCount: number;
  totalCount: number;
  hasWatchlist: boolean;
}

/**
 * Reads items from the user's WATCHLIST default list. Returns both kinds
 * pre-split so the UI can render a Movies/TV toggle without re-fetching.
 */
export function useMyWatchlist(): UseMyWatchlistResult {
  const accessToken = useAuthStore((s) => s.accessToken);
  const myLists = useMyLists();
  const watchlist = useMemo(
    () => myLists.data?.find((l) => l.defaultKind === "WATCHLIST") ?? null,
    [myLists.data]
  );

  const itemsQuery = useQuery({
    queryKey: ["list-items", watchlist?.id, "all"],
    queryFn: () => listsService.items(watchlist!.id, 0, 200),
    enabled: accessToken !== null && watchlist !== null,
    staleTime: 30_000,
  });

  const items = itemsQuery.data?.content ?? [];
  const movies = items.filter((i) => i.kind === ("MOVIE" as ListItemKind));
  const series = items.filter((i) => i.kind === ("SERIES" as ListItemKind));

  return {
    isLoading: myLists.isLoading || (Boolean(watchlist) && itemsQuery.isLoading),
    items,
    movies,
    series,
    movieCount: movies.length,
    seriesCount: series.length,
    totalCount: items.length,
    hasWatchlist: Boolean(watchlist),
  };
}
