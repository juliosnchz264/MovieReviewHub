"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useTmdbPopular,
  useTmdbSearch,
  useImportTmdbMovie,
} from "@/features/admin/hooks/useTmdb";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTranslate } from "@/hooks/useTranslate";
import type { TmdbMovieView } from "@/types/tmdb";

export default function ImportTmdbPage() {
  const t = useTranslate();
  const [input, setInput] = useState("");
  const query = useDebouncedValue(input, 400);

  const search = useTmdbSearch(query);
  const popular = useTmdbPopular(query.length < 2);
  const importMutation = useImportTmdbMovie();

  const isSearching = query.length >= 2;
  const data = isSearching ? search.data : popular.data;
  const isLoading = isSearching ? search.isLoading : popular.isLoading;
  const error = isSearching ? search.error : popular.error;

  function onImport(tmdbId: number, title: string) {
    importMutation.mutate(tmdbId, {
      onSuccess: () => toast.success(t("admin.importMovies.importedToast", { title })),
      onError: (err) => {
        const message =
          (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
          t("admin.importMovies.importFailed");
        toast.error(message);
      },
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium">{t("admin.importMovies.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("admin.importMovies.subtitle")}
        </p>
      </div>

      <input
        type="search"
        placeholder={t("admin.importMovies.searchPlaceholder")}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
      />

      <p className="text-xs text-muted-foreground">
        {isSearching ? t("admin.importMovies.resultsFor", { query }) : t("admin.importMovies.popularThisWeek")}
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
        <p className="text-destructive">{t("admin.importMovies.loadFailed")}</p>
      )}

      {!isLoading && data && data.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">{t("admin.importMovies.noResults")}</p>
      )}

      {data && data.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.map((m) => (
            <TmdbCard
              key={m.tmdbId}
              movie={m}
              onImport={() => onImport(m.tmdbId, m.title)}
              importing={importMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TmdbCard({
  movie,
  onImport,
  importing,
}: {
  movie: TmdbMovieView;
  onImport: () => void;
  importing: boolean;
}) {
  const t = useTranslate();
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative aspect-2/3 bg-muted">
        {movie.posterUrl ? (
          <Image
            src={movie.posterUrl}
            alt={movie.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            {t("admin.importMovies.noImage")}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-1 text-sm font-medium">{movie.title}</h3>
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {movie.releaseDate ? movie.releaseDate.slice(0, 4) : "—"}
          {movie.voteAverage ? ` • ⭐ ${movie.voteAverage.toFixed(1)}` : ""}
          {movie.genres && movie.genres.length > 0
            ? ` • ${movie.genres.join(", ")}`
            : ""}
        </p>
        <div className="mt-auto pt-2">
          {movie.alreadyImported ? (
            <Button variant="outline" size="sm" disabled className="w-full">
              {t("admin.importMovies.imported")}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onImport}
              disabled={importing}
              className="w-full"
            >
              {importing ? t("admin.importMovies.importing") : t("admin.importMovies.import")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
