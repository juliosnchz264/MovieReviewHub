"use client";

import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useInMyLists, useMyLists } from "@/features/lists/hooks/useLists";
import { listsService } from "@/features/lists/services/lists.service";
import { useTranslate } from "@/hooks/useTranslate";
import type { DefaultListKind, ListItemKind } from "@/types/list";

interface ToggleArgs {
  kind: ListItemKind;
  targetId: number;
  isIn: boolean;
}

export function useDefaultList(defaultKind: DefaultListKind) {
  const qc = useQueryClient();
  const myLists = useMyLists();
  const t = useTranslate();

  const list = useMemo(
    () => myLists.data?.find((l) => l.defaultKind === defaultKind) ?? null,
    [myLists.data, defaultKind]
  );

  const toggle = useMutation({
    mutationFn: async ({ kind, targetId, isIn }: ToggleArgs) => {
      if (!list) throw new Error(`Default list ${defaultKind} not found`);

      if (isIn) {
        const items = await listsService.items(list.id, 0, 100);
        const item = items.content.find((i) =>
          kind === "MOVIE" ? i.movie?.id === targetId : i.series?.id === targetId
        );
        if (item) await listsService.removeItem(list.id, item.id);
        return { added: false };
      }
      await listsService.addItem(list.id, { kind, targetId });
      return { added: true };
    },
    onMutate: async ({ kind, targetId, isIn }) => {
      if (!list) return;
      const key = ["in-my-lists", kind, targetId];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<number[]>(key) ?? [];
      const next = isIn
        ? prev.filter((id) => id !== list.id)
        : [...prev, list.id];
      qc.setQueryData(key, next);
      return { prev, key };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.key) qc.setQueryData(ctx.key, ctx.prev);
      toast.error(
        defaultKind === "WATCHLIST"
          ? t("toasts.watchlistError")
          : t("toasts.watchedError")
      );
    },
    onSuccess: (result) => {
      if (defaultKind === "WATCHLIST") {
        toast.success(result.added ? t("toasts.watchlistAdded") : t("toasts.watchlistRemoved"));
      } else {
        toast.success(result.added ? t("toasts.watchedAdded") : t("toasts.watchedRemoved"));
      }
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ["in-my-lists", vars.kind, vars.targetId] });
      qc.invalidateQueries({ queryKey: ["lists", "me"] });
      qc.invalidateQueries({ queryKey: ["lists", "by-user"] });
      qc.invalidateQueries({ queryKey: ["list"] });
      if (list) {
        qc.invalidateQueries({ queryKey: ["list-items", list.id] });
      }
    },
  });

  return { list, toggle };
}

export function useIsInDefaultList(
  defaultKind: DefaultListKind,
  kind: ListItemKind,
  targetId: number
) {
  const { data: lists } = useMyLists();
  const { data: inLists } = useInMyLists(kind, targetId);
  const list = lists?.find((l) => l.defaultKind === defaultKind);
  if (!list) return false;
  return (inLists ?? []).includes(list.id);
}
