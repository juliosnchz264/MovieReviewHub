"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useMovies } from "@/features/movies/hooks/useMovies";
import { useDeleteMovie } from "@/features/movies/hooks/useMovieMutations";
import { useRefreshMovieGenres } from "@/features/admin/hooks/useTmdb";
import { useTranslate } from "@/hooks/useTranslate";

const PAGE_SIZE = 20;

export default function AdminMoviesPage() {
  const t = useTranslate();
  const [page, setPage] = useState(0);
  const { data, isLoading, isError } = useMovies({
    page,
    size: PAGE_SIZE,
    sort: "createdAt,desc",
  });
  const deleteMutation = useDeleteMovie();
  const refreshGenres = useRefreshMovieGenres();

  function onDelete(id: number, title: string) {
    if (!confirm(t("admin.movies.confirmDelete", { title }))) return;
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success(t("admin.movies.deleted", { title })),
      onError: () => toast.error(t("admin.movies.deleteFailed")),
    });
  }

  function onRefreshGenres() {
    if (!confirm(t("admin.movies.confirmRefreshGenres"))) return;
    refreshGenres.mutate(undefined, {
      onSuccess: (r) =>
        toast.success(t("admin.movies.refreshResult", { updated: r.updated, skipped: r.skipped, failed: r.failed })),
      onError: () => toast.error(t("admin.movies.refreshFailed")),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("admin.movies.count", { count: data?.totalElements ?? 0 })}</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onRefreshGenres}
            disabled={refreshGenres.isPending}
          >
            {refreshGenres.isPending ? t("admin.movies.refreshing") : t("admin.movies.refreshGenres")}
          </Button>
          <Link href="/admin/movies/new">
            <Button>{t("admin.movies.newMovie")}</Button>
          </Link>
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">{t("admin.common.loading")}</p>}
      {isError && <p className="text-destructive">{t("admin.common.loadFailed")}</p>}

      {data && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">{t("admin.common.title")}</th>
                <th className="px-4 py-2 font-medium">{t("admin.common.genre")}</th>
                <th className="px-4 py-2 font-medium">{t("admin.movies.release")}</th>
                <th className="px-4 py-2 text-right font-medium">{t("admin.common.actions")}</th>
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
                          {t("admin.common.edit")}
                        </Button>
                      </Link>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(movie.id, movie.title)}
                        disabled={deleteMutation.isPending}
                      >
                        {t("admin.common.delete")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.content.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    {t("admin.movies.empty")}
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
            {t("admin.common.pageOf", { page: data.page + 1, total: data.totalPages })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={data.first}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              {t("admin.common.prev")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={data.last}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("admin.common.next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
