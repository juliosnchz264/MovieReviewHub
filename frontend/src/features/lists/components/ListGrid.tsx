"use client";

import { ListCard } from "./ListCard";
import type { CustomList } from "@/types/list";

interface Props {
  lists: CustomList[];
  /** Show owner-only affordances on each card (kebab menu with delete). */
  canManage?: boolean;
  onDelete?: (list: CustomList) => void;
}

export function ListGrid({ lists, canManage, onDelete }: Props) {
  if (lists.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
        No lists yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {lists.map((list) => (
        <ListCard
          key={list.id}
          list={list}
          canManage={canManage}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
