"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { CardActionsMenu } from "@/features/cards/components/CardActionsMenu";
import { MyRatingDisplay } from "@/features/cards/components/MyRatingDisplay";
import { cn } from "@/lib/utils";
import type { Movie } from "@/types/movie";

interface Props {
  title: string;
  subtitle?: string;
  movies: Movie[] | undefined;
  isLoading?: boolean;
  emptyText?: string;
}

export function MovieRow({ title, subtitle, movies, isLoading, emptyText }: Props) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      {isLoading && (
        <ScrollContainer>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-40 shrink-0">
              <Skeleton className="aspect-2/3 w-full rounded-xl opacity-60" />
              <Skeleton className="mt-2 h-4 w-3/4 opacity-60" />
            </div>
          ))}
        </ScrollContainer>
      )}

      {!isLoading && (!movies || movies.length === 0) && (
        <p className="rounded-md border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          {emptyText ?? "Nothing here yet"}
        </p>
      )}

      {!isLoading && movies && movies.length > 0 && (
        <ScrollContainer>
          {movies.map((movie) => (
            <article
              key={movie.id}
              className="group relative w-40 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-card/40 transition hover:border-border hover:bg-card hover:shadow-md"
            >
              <div className="absolute right-1.5 top-1.5 z-10 flex items-center gap-1">
                <CardActionsMenu kind="MOVIE" targetId={movie.id} />
              </div>
              <MyRatingDisplay
                kind="MOVIE"
                targetId={movie.id}
                className="absolute left-1.5 top-1.5 z-10"
              />
              <Link href={`/movies/${movie.id}`} className="block">
                <div className="relative aspect-2/3 bg-muted/60">
                  {movie.imageUrl ? (
                    <Image
                      src={movie.imageUrl}
                      alt={movie.title}
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
                  <h3 className="line-clamp-1 text-xs font-medium">{movie.title}</h3>
                  <p className="line-clamp-1 text-[10px] text-muted-foreground">
                    {movie.releaseDate ? movie.releaseDate.slice(0, 4) : "—"}
                    {movie.genres && movie.genres.length > 0
                      ? ` • ${movie.genres.join(", ")}`
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

/**
 * Scroll horizontal con fade derecha visible solo en posicion default.
 *
 * Comportamiento:
 *   - scrollLeft === 0  -> fade visible (hint scroll a la derecha)
 *   - scrollLeft > 0    -> fade desaparece (usuario ya esta interactuando)
 *   - llega al final    -> fade tampoco se muestra
 */
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

  // Wrapper hereda el -mx-4 para que `right-0` del fade caiga en el borde
  // derecho real del scroller (sin offset por el padding/margen).
  return (
    <div className="relative -mx-4">
      <div
        ref={scrollerRef}
        className="overflow-x-auto px-4 pb-2 [scrollbar-width:thin]"
      >
        <div className="flex gap-3" style={{ minWidth: "max-content" }}>
          {children}
        </div>
      </div>

      {/* Fade w-12 al borde derecho. Visible solo en posicion default. */}
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
