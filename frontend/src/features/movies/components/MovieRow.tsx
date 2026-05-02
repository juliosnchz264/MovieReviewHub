"use client";

import Link from "next/link";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { FavoriteButton } from "@/features/favorites/components/FavoriteButton";
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
        <div className="-mx-4 overflow-x-auto px-4 pb-2">
          <div className="flex gap-3" style={{ minWidth: "max-content" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-[160px] shrink-0">
                <Skeleton className="aspect-2/3 w-full rounded-xl" />
                <Skeleton className="mt-2 h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && (!movies || movies.length === 0) && (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {emptyText ?? "Nothing here yet"}
        </p>
      )}

      {!isLoading && movies && movies.length > 0 && (
        <div className="-mx-4 overflow-x-auto px-4 pb-2">
          <div className="flex gap-3" style={{ minWidth: "max-content" }}>
            {movies.map((movie) => (
              <article
                key={movie.id}
                className="group relative w-[160px] shrink-0 overflow-hidden rounded-xl border border-border bg-card transition hover:shadow-md"
              >
                <FavoriteButton
                  movieId={movie.id}
                  variant="icon"
                  className="absolute right-1.5 top-1.5 z-10"
                />
                <Link href={`/movies/${movie.id}`} className="block">
                  <div className="relative aspect-2/3 bg-muted">
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
                    <p className="text-[10px] text-muted-foreground">
                      {movie.releaseDate ? movie.releaseDate.slice(0, 4) : "—"}
                      {movie.genre ? ` • ${movie.genre}` : ""}
                    </p>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
