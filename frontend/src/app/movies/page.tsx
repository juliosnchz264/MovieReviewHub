"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useMovies } from "@/features/movies/hooks/useMovies";
import { FavoriteButton } from "@/features/favorites/components/FavoriteButton";

const PAGE_SIZE = 12;

export default function MoviesPage() {
  const [titleInput, setTitleInput] = useState("");
  const [titleQuery, setTitleQuery] = useState("");
  const [genre, setGenre] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, isFetching } = useMovies({
    title: titleQuery || undefined,
    genre: genre || undefined,
    page,
    size: PAGE_SIZE,
    sort: "releaseDate,desc",
  });

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
    setTitleQuery(titleInput);
  }

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Movies</h1>
          <Link href="/dashboard">
            <Button variant="outline">Dashboard</Button>
          </Link>
        </div>

        <form onSubmit={onSearch} className="flex flex-wrap gap-3">
          <input
            type="search"
            placeholder="Search title..."
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            className="min-w-[240px] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          <select
            value={genre}
            onChange={(e) => {
              setGenre(e.target.value);
              setPage(0);
            }}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          >
            <option value="">All genres</option>
            <option value="Action">Action</option>
            <option value="Drama">Drama</option>
            <option value="Comedy">Comedy</option>
            <option value="Horror">Horror</option>
            <option value="Sci-Fi">Sci-Fi</option>
            <option value="Romance">Romance</option>
            <option value="Thriller">Thriller</option>
          </select>
          <Button type="submit">Search</Button>
        </form>

        {isLoading && <p className="text-muted-foreground">Loading...</p>}
        {isError && <p className="text-destructive">Failed to load movies</p>}

        {data && data.content.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">No movies found</p>
        )}

        {data && data.content.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {data.content.map((movie) => (
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
                          sizes="(max-width: 768px) 50vw, 25vw"
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

            <div className="flex items-center justify-between border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">
                Page {data.page + 1} of {data.totalPages} • {data.totalElements} total
                {isFetching && <span className="ml-2">(loading...)</span>}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.first}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.last}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
