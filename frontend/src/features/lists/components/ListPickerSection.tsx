"use client";

import { useMemo } from "react";
import { BookmarkCheck, Plus } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/hooks/useTranslate";
import {
  useAddListItem,
  useInMyLists,
  useMyLists,
  useRemoveListItem,
} from "@/features/lists/hooks/useLists";
import { listsService } from "@/features/lists/services/lists.service";
import type { CustomList, ListItemKind } from "@/types/list";

interface Props {
  kind: ListItemKind;
  targetId: number;
  onCreateClick: () => void;
}

export function ListPickerSection({ kind, targetId, onCreateClick }: Props) {
  const t = useTranslate();
  const myLists = useMyLists();
  const inMyLists = useInMyLists(kind, targetId);

  const containedSet = useMemo(
    () => new Set(inMyLists.data ?? []),
    [inMyLists.data]
  );

  const visibleLists = useMemo(
    () => (myLists.data ?? []).filter((l) => l.defaultKind !== "WATCHED"),
    [myLists.data]
  );

  return (
    <>
      <div className="border-b border-border px-3 py-2 text-xs font-medium">
        {t("lists.pickerTitle")}
      </div>

      <div className="max-h-72 overflow-y-auto py-1">
        {myLists.isLoading && (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            {t("lists.pickerLoading")}
          </p>
        )}
        {!myLists.isLoading && visibleLists.length === 0 && (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            {t("lists.pickerEmpty")}
          </p>
        )}
        {visibleLists.map((list) => (
          <ListRow
            key={list.id}
            list={list}
            kind={kind}
            targetId={targetId}
            inList={containedSet.has(list.id)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onCreateClick}
        className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-sm hover:bg-muted"
      >
        <Plus className="size-4" />
        {t("lists.pickerCreateNew")}
      </button>
    </>
  );
}

function ListRow({
  list,
  kind,
  targetId,
  inList,
}: {
  list: CustomList;
  kind: ListItemKind;
  targetId: number;
  inList: boolean;
}) {
  const t = useTranslate();
  const qc = useQueryClient();
  const add = useAddListItem(list.id);
  const remove = useRemoveListItem(list.id);
  const pending = add.isPending || remove.isPending;

  async function toggle() {
    if (inList) {
      const items = await listsService.items(list.id, 0, 100);
      const item = items.content.find((i) =>
        kind === "MOVIE" ? i.movie?.id === targetId : i.series?.id === targetId
      );
      if (item) {
        await remove.mutateAsync(item.id);
        toast.success(t("lists.pickerItemRemoved", { title: list.title }));
        qc.invalidateQueries({ queryKey: ["in-my-lists", kind, targetId] });
      }
    } else {
      await add.mutateAsync({ kind, targetId });
      toast.success(t("lists.pickerItemAdded", { title: list.title }));
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
      )}
    >
      <span
        className={cn(
          "grid size-4 place-items-center rounded border",
          inList ? "border-primary bg-primary text-primary-foreground" : "border-border"
        )}
      >
        {inList && <BookmarkCheck className="size-3" />}
      </span>
      <span className="flex-1 truncate">{list.title}</span>
      <span className="text-[10px] text-muted-foreground">{list.itemCount}</span>
    </button>
  );
}
