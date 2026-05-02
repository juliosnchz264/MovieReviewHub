"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useInfiniteMovies } from "@/features/movies/hooks/useInfiniteMovies";
import { MovieGridSkeleton } from "@/features/movies/components/MovieCardSkeleton";
import { FavoriteButton } from "@/features/favorites/components/FavoriteButton";
import { ThemeToggle } from "@/components/theme-toggle";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useIntersection } from "@/hooks/useIntersection";

const GENRES = ["", "Action", "Drama", "Comedy", "Horror", "Sci-Fi", "Romance", "Thriller"];

export default function MoviesPage() {
  const [titleInput, setTitleInput] = useState("");
  const [genre, setGenre] = useState("");
  const debouncedTitle = useDebouncedValue(titleInput, 350);

  const filters = useMemo(
    () => ({
      title: debouncedTitle || undefined,
      genre: genre || undefined,
    }),
    [debouncedTitle, genre]
  );

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteMovies(filters);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersection(sentinelRef, { rootMargin: "300px" });

  useEffect(() => {
    if (isVisible && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isVisible, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const movies = data?.pages.flatMap((p) => p.content) ?? [];
  const totalElements = data?.pages[0]?.totalElements ?? 0;

  return (
    <main className="min-h-screen px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Movies</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/dashboard">
              <Button variant="outline">Dashboard</Button>
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <input
            type="search"
            placeholder="Search title..."
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            className="min-w-[200px] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          >
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g || "All genres"}
              </option>
            ))}
          </select>
        </div>

        {!isLoading && (
          <p className="text-sm text-muted-foreground">
            {totalElements} {totalElements === 1 ? "movie" : "movies"}
          </p>
        )}

        {isLoading && <MovieGridSkeleton count={8} />}
        {isError && <p className="text-destructive">Failed to load movies</p>}

        {!isLoading && movies.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">No movies found</p>
        )}

        {movies.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {movies.map((movie) => (
              <div
                key={movie.id}
                className="group relative overflow-hidden rounded-xl border border-border bg-card transition hover:shadow-md"
              >
                <FavoriteButton
                  movieId={movie.id}
                  variant="icon"
                  className="absolute right-2 top-2 z-10"
                />
                <Link href={`/movies/${movie.id}`} className="block">
                  <div className="relative aspect-2/3 bg-muted">
                    {movie.imageUrl ? (
                      <Image
                        src={movie.imageUrl}
                        alt={movie.title}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="line-clamp-1 text-sm font-medium">{movie.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {movie.genre ?? "—"}
                      {movie.releaseDate ? ` • ${movie.releaseDate.slice(0, 4)}` : ""}
                    </p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}

        <div ref={sentinelRef} className="h-10" />

        {isFetchingNextPage && <MovieGridSkeleton count={4} />}

        {!hasNextPage && movies.length > 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            End of catalog
          </p>
        )}
      </div>
    </main>
  );
}
