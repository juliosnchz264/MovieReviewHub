"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useImportTmdbSeries,
  useTmdbTvPopular,
  useTmdbTvSearch,
} from "@/features/series/hooks/useSeries";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTranslate } from "@/hooks/useTranslate";
import type { TmdbTvView } from "@/types/series";

export default function ImportTmdbSeriesPage() {
  const t = useTranslate();
  const [input, setInput] = useState("");
  const query = useDebouncedValue(input, 400);

  const search = useTmdbTvSearch(query);
  const popular = useTmdbTvPopular(query.length < 2);
  const importMutation = useImportTmdbSeries();

  const isSearching = query.length >= 2;
  const data = isSearching ? search.data : popular.data;
  const isLoading = isSearching ? search.isLoading : popular.isLoading;
  const error = isSearching ? search.error : popular.error;

  function onImport(tmdbId: number, title: string) {
    importMutation.mutate(tmdbId, {
      onSuccess: () => toast.success(t("admin.importSeries.importedToast", { title })),
      onError: (err) => {
        const message =
          (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
          t("admin.importSeries.importFailed");
        toast.error(message);
      },
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium">{t("admin.importSeries.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("admin.importSeries.subtitle")}
        </p>
      </div>

      <input
        type="search"
        placeholder={t("admin.importSeries.searchPlaceholder")}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
      />

      <p className="text-xs text-muted-foreground">
        {isSearching ? t("admin.importSeries.resultsFor", { query }) : t("admin.importSeries.popularThisWeek")}
      </p>

      {isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
              <Skeleton className="aspect-2/3 w-full rounded-none" />
              <div className="space-y-2 p-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-destructive">{t("admin.importSeries.loadFailed")}</p>
      )}

      {!isLoading && data && data.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">{t("admin.importSeries.noResults")}</p>
      )}

      {data && data.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.map((show) => (
            <TvCard
              key={show.tmdbId}
              show={show}
              onImport={() => onImport(show.tmdbId, show.title)}
              importing={importMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TvCard({
  show,
  onImport,
  importing,
}: {
  show: TmdbTvView;
  onImport: () => void;
  importing: boolean;
}) {
  const t = useTranslate();
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative aspect-2/3 bg-muted">
        {show.posterUrl ? (
          <Image
            src={show.posterUrl}
            alt={show.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            {t("admin.importSeries.noImage")}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-1 text-sm font-medium">{show.title}</h3>
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {show.firstAirDate ? show.firstAirDate.slice(0, 4) : "—"}
          {show.numberOfSeasons ? ` • ${show.numberOfSeasons}S` : ""}
          {show.voteAverage ? ` • ⭐ ${show.voteAverage.toFixed(1)}` : ""}
          {show.genres && show.genres.length > 0
            ? ` • ${show.genres.join(", ")}`
            : ""}
        </p>
        <div className="mt-auto pt-2">
          {show.alreadyImported ? (
            <Button variant="outline" size="sm" disabled className="w-full">
              {t("admin.importSeries.imported")}
            </Button>
          ) : (
            <Button size="sm" onClick={onImport} disabled={importing} className="w-full">
              {importing ? t("admin.importSeries.importing") : t("admin.importSeries.import")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
