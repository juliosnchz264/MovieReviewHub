"use client";

import Link from "next/link";
import Image from "next/image";
import { ListChecks, MoreVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/hooks/useTranslate";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VisibilityBadge } from "./VisibilityBadge";
import type { CustomList, ListItem } from "@/types/list";

interface Props {
  list: CustomList;
  /** First few items used to render the poster montage. Optional. */
  preview?: ListItem[];
  className?: string;
  /** Show owner-only affordances (kebab menu with delete). */
  canManage?: boolean;
  onDelete?: (list: CustomList) => void;
}

export function ListCard({ list, preview, className, canManage, onDelete }: Props) {
  const t = useTranslate();
  const posters = (preview ?? [])
    .map((i) => (i.movie?.imageUrl ?? i.series?.imageUrl) || null)
    .filter((u): u is string => Boolean(u))
    .slice(0, 4);

  // Default lists no se borran (rechazo del backend). Defensivo: oculta el menu.
  const showMenu = Boolean(canManage && onDelete && !list.isDefault);

  return (
    <div className={cn("group relative", className)}>
      <Link
        href={`/lists/${list.slug}`}
        className="block overflow-hidden rounded-xl border border-border/60 bg-card transition hover:border-border hover:shadow-md"
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
            {list.itemCount === 1
              ? t("lists.itemCountOne", { n: list.itemCount })
              : t("lists.itemCountMany", { n: list.itemCount })}
            {list.isDefault && ` · ${t("lists.defaultBadge")}`}
          </p>
        </div>
      </Link>

      {showMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="List options"
            onClick={(e) => {
              // Evita disparar la navegacion del Link al abrir el menu.
              e.preventDefault();
              e.stopPropagation();
            }}
            className={cn(
              "absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-md border border-border/60 bg-background/85 text-muted-foreground backdrop-blur transition",
              "opacity-0 hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "data-[state=open]:opacity-100"
            )}
          >
            <MoreVertical className="size-4" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => onDelete?.(list)}
            >
              <Trash2 className="size-4" aria-hidden />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
