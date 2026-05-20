"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { CardActionsMenu } from "@/features/cards/components/CardActionsMenu";
import { MyRatingDisplay } from "@/features/cards/components/MyRatingDisplay";
import { cn } from "@/lib/utils";
import type { Series } from "@/types/series";

interface Props {
  title: string;
  subtitle?: string;
  items: Series[] | undefined;
  isLoading?: boolean;
  emptyText?: string;
}

export function SeriesRow({ title, subtitle, items, isLoading, emptyText }: Props) {
  return (
    <section className="space-y-3">
      <div className="px-px">
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{title}</h2>
        {subtitle && (
          <p className="text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
        )}
      </div>

      {isLoading && (
        <ScrollContainer>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-32 shrink-0 sm:w-36 md:w-40">
              <Skeleton className="aspect-2/3 w-full rounded-xl opacity-60" />
              <Skeleton className="mt-2 h-4 w-3/4 opacity-60" />
            </div>
          ))}
        </ScrollContainer>
      )}

      {!isLoading && (!items || items.length === 0) && (
        <p className="rounded-md border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          {emptyText ?? "Nothing here yet"}
        </p>
      )}

      {!isLoading && items && items.length > 0 && (
        <ScrollContainer>
          {items.map((s) => (
            <article
              key={s.id}
              className="group relative w-32 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-card/40 transition hover:border-border hover:bg-card hover:shadow-md sm:w-36 md:w-40"
            >
              <div className="absolute right-1.5 top-1.5 z-10 flex items-center gap-1">
                <CardActionsMenu kind="SERIES" targetId={s.id} />
              </div>
              <MyRatingDisplay
                kind="SERIES"
                targetId={s.id}
                className="absolute left-1.5 top-1.5 z-10"
              />
              <Link href={`/series/${s.id}`} className="block">
                <div className="relative aspect-2/3 bg-muted/60">
                  {s.imageUrl ? (
                    <Image
                      src={s.imageUrl}
                      alt={s.title}
                      fill
                      sizes="160px"
                      className="object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <h3 className="line-clamp-1 text-xs font-medium">{s.title}</h3>
                  <p className="line-clamp-1 text-[10px] text-muted-foreground">
                    {s.firstAirDate ? s.firstAirDate.slice(0, 4) : "—"}
                    {s.numberOfSeasons ? ` • ${s.numberOfSeasons}S` : ""}
                    {s.genres && s.genres.length > 0
                      ? ` • ${s.genres.join(", ")}`
                      : ""}
                  </p>
                </div>
              </Link>
            </article>
          ))}
        </ScrollContainer>
      )}
    </section>
  );
}

function ScrollContainer({ children }: { children: ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const update = () => {
      setHasOverflow(el.scrollWidth > el.clientWidth + 4);
      setAtStart(el.scrollLeft <= 4);
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  const showFade = atStart && hasOverflow;

  return (
    <div className="relative -mx-3 sm:-mx-4">
      <div
        ref={scrollerRef}
        className="touch-pan-x overflow-x-auto overscroll-x-contain px-3 pb-2 [scrollbar-width:thin] [-webkit-overflow-scrolling:touch] sm:px-4"
      >
        <div className="flex gap-3 sm:gap-4" style={{ minWidth: "max-content" }}>
          {children}
        </div>
      </div>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-12 transition-opacity duration-300",
          "bg-linear-to-l from-background via-background/70 to-transparent",
          showFade ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}
