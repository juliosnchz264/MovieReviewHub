"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useMovies } from "@/features/movies/hooks/useMovies";
import { useDeleteMovie } from "@/features/movies/hooks/useMovieMutations";
import { useRefreshMovieGenres } from "@/features/admin/hooks/useTmdb";

const PAGE_SIZE = 20;

export default function AdminMoviesPage() {
  const [page, setPage] = useState(0);
  const { data, isLoading, isError } = useMovies({
    page,
    size: PAGE_SIZE,
    sort: "createdAt,desc",
  });
  const deleteMutation = useDeleteMovie();
  const refreshGenres = useRefreshMovieGenres();

  function onDelete(id: number, title: string) {
    if (!confirm(`Delete "${title}"? (soft delete, recoverable)`)) return;
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success(`Deleted "${title}"`),
      onError: () => toast.error("Delete failed"),
    });
  }

  function onRefreshGenres() {
    if (!confirm("Re-fetch genres from TMDB for every movie? May take a while.")) return;
    refreshGenres.mutate(undefined, {
      onSuccess: (r) =>
        toast.success(`Updated ${r.updated} • skipped ${r.skipped} • failed ${r.failed}`),
      onError: () => toast.error("Refresh failed"),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data?.totalElements ?? 0} movies</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onRefreshGenres}
            disabled={refreshGenres.isPending}
          >
            {refreshGenres.isPending ? "Refreshing..." : "Refresh genres from TMDB"}
          </Button>
          <Link href="/admin/movies/new">
            <Button>New movie</Button>
          </Link>
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading...</p>}
      {isError && <p className="text-destructive">Failed to load</p>}

      {data && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Genre</th>
                <th className="px-4 py-2 font-medium">Release</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.content.map((movie) => (
                <tr key={movie.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">{movie.title}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {movie.genres && movie.genres.length > 0 ? movie.genres.join(", ") : "—"}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {movie.releaseDate ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/movies/${movie.id}/edit`}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(movie.id, movie.title)}
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.content.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    No movies yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.page + 1} of {data.totalPages}
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
      )}
    </div>
  );
}
