"use client";

import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ListItem } from "@/types/list";

interface Props {
  item: ListItem;
  canEdit?: boolean;
  onRemove?: (itemId: number) => void;
  className?: string;
}

export function ListItemRow({ item, canEdit, onRemove, className }: Props) {
  const isMovie = item.kind === "MOVIE";
  const target = isMovie ? item.movie : item.series;
  if (!target) return null;

  const href = isMovie ? `/movies/${target.slug}` : `/series/${target.id}`;
  const year = isMovie
    ? item.movie?.releaseDate?.slice(0, 4)
    : item.series?.firstAirDate?.slice(0, 4);

  return (
    <article
      className={cn(
        "group relative w-40 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-card/40 transition hover:border-border hover:bg-card hover:shadow-md",
        className
      )}
    >
      {canEdit && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(item.id);
          }}
          aria-label="Remove from list"
          className="absolute right-1.5 top-1.5 z-10 rounded-full bg-background/80 p-1 opacity-0 backdrop-blur transition hover:bg-background group-hover:opacity-100"
        >
          <X className="size-3.5" />
        </button>
      )}
      <Link href={href} className="block">
        <div className="relative aspect-2/3 bg-muted/60">
          {target.imageUrl ? (
            <Image
              src={target.imageUrl}
              alt={target.title}
              fill
              sizes="160px"
              className="object-cover transition group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No image
            </div>
          )}
          <span className="absolute left-1.5 top-1.5 rounded-full bg-background/85 px-1.5 py-0.5 text-[9px] font-medium uppercase backdrop-blur">
            {item.kind}
          </span>
        </div>
        <div className="p-2">
          <h3 className="line-clamp-1 text-xs font-medium">{target.title}</h3>
          <p className="line-clamp-1 text-[10px] text-muted-foreground">{year ?? "—"}</p>
          {item.note && (
            <p className="mt-1 line-clamp-2 text-[10px] italic text-muted-foreground">
              {item.note}
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}
