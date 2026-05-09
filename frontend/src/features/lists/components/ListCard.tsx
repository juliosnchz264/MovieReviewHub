"use client";

import Link from "next/link";
import Image from "next/image";
import { ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { VisibilityBadge } from "./VisibilityBadge";
import type { CustomList, ListItem } from "@/types/list";

interface Props {
  list: CustomList;
  /** First few items used to render the poster montage. Optional. */
  preview?: ListItem[];
  className?: string;
}

export function ListCard({ list, preview, className }: Props) {
  const posters = (preview ?? [])
    .map((i) => (i.movie?.imageUrl ?? i.series?.imageUrl) || null)
    .filter((u): u is string => Boolean(u))
    .slice(0, 4);

  return (
    <Link
      href={`/lists/${list.slug}`}
      className={cn(
        "group block overflow-hidden rounded-xl border border-border/60 bg-card transition hover:border-border hover:shadow-md",
        className
      )}
    >
      <div className="grid aspect-video grid-cols-2 grid-rows-2 gap-px bg-muted/40">
        {posters.length === 0 && (
          <div className="col-span-2 row-span-2 flex items-center justify-center text-muted-foreground">
            <ListChecks className="size-8 opacity-40" />
          </div>
        )}
        {posters.map((url, i) => (
          <div
            key={i}
            className={cn(
              "relative bg-muted",
              posters.length === 1 && "col-span-2 row-span-2",
              posters.length === 2 && "row-span-2",
              posters.length === 3 && i === 0 && "row-span-2"
            )}
          >
            <Image
              src={url}
              alt=""
              fill
              sizes="240px"
              className="object-cover transition group-hover:scale-105"
            />
          </div>
        ))}
      </div>

      <div className="space-y-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-sm font-semibold">{list.title}</h3>
          <VisibilityBadge visibility={list.visibility} />
        </div>
        <p className="text-xs text-muted-foreground">
          {list.itemCount} {list.itemCount === 1 ? "item" : "items"}
          {list.isDefault && " · default"}
        </p>
      </div>
    </Link>
  );
}
