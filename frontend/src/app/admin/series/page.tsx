"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSeriesPaginated, useDeleteSeries } from "@/features/series/hooks/useSeries";
import { useRefreshSeriesGenres } from "@/features/admin/hooks/useTmdb";
import { useTranslate } from "@/hooks/useTranslate";

const PAGE_SIZE = 20;

export default function AdminSeriesPage() {
  const t = useTranslate();
  const [page, setPage] = useState(0);
  const { data, isLoading, isError } = useSeriesPaginated({
    page,
    size: PAGE_SIZE,
    sort: "createdAt,desc",
  });
  const deleteMutation = useDeleteSeries();
  const refreshGenres = useRefreshSeriesGenres();

  function onDelete(id: number, title: string) {
    if (!confirm(t("admin.series.confirmDelete", { title }))) return;
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success(t("admin.series.deleted", { title })),
      onError: () => toast.error(t("admin.series.deleteFailed")),
    });
  }

  function onRefreshGenres() {
    if (!confirm(t("admin.series.confirmRefreshGenres"))) return;
    refreshGenres.mutate(undefined, {
      onSuccess: (r) =>
        toast.success(t("admin.series.refreshResult", { updated: r.updated, skipped: r.skipped, failed: r.failed })),
      onError: () => toast.error(t("admin.series.refreshFailed")),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("admin.series.count", { count: data?.totalElements ?? 0 })}</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onRefreshGenres}
            disabled={refreshGenres.isPending}
          >
            {refreshGenres.isPending ? t("admin.series.refreshing") : t("admin.series.refreshGenres")}
          </Button>
          <Link href="/admin/series/import">
            <Button>{t("admin.series.importFromTmdb")}</Button>
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
                <th className="px-4 py-2 font-medium">{t("admin.series.firstAired")}</th>
                <th className="px-4 py-2 font-medium">{t("admin.series.seasons")}</th>
                <th className="px-4 py-2 text-right font-medium">{t("admin.common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {data.content.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">{s.title}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {s.genres && s.genres.length > 0 ? s.genres.join(", ") : "—"}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {s.firstAirDate ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {s.numberOfSeasons ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/series/${s.id}`}>
                        <Button variant="outline" size="sm">{t("admin.common.view")}</Button>
                      </Link>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(s.id, s.title)}
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
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    {t("admin.series.empty")}
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
