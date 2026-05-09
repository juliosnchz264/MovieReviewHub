"use client";

import { ListCard } from "./ListCard";
import type { CustomList } from "@/types/list";

interface Props {
  lists: CustomList[];
}

export function ListGrid({ lists }: Props) {
  if (lists.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
        No lists yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {lists.map((list) => (
        <ListCard key={list.id} list={list} />
      ))}
    </div>
  );
}
