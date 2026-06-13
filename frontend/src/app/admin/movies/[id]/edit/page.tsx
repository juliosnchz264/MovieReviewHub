"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { MovieForm } from "@/features/movies/components/MovieForm";
import { useMovie } from "@/features/movies/hooks/useMovie";
import { useUpdateMovie } from "@/features/movies/hooks/useMovieMutations";
import { useTranslate } from "@/hooks/useTranslate";
import type { ApiError } from "@/types/auth";
import type { MovieRequest } from "@/types/movie";

export default function EditMoviePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useTranslate();
  const { id } = use(params);
  const movieId = Number(id);
  const router = useRouter();
  const { data: movie, isLoading, isError } = useMovie(
    Number.isFinite(movieId) ? movieId : null
  );
  const update = useUpdateMovie(movieId);

  async function onSubmit(payload: MovieRequest) {
    update.mutate(payload, {
      onSuccess: () => router.push("/admin/movies"),
    });
  }

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <Link href="/admin/movies">
          <Button variant="outline" size="sm">
            {t("admin.common.back")}
          </Button>
        </Link>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h1 className="mb-4 text-2xl font-semibold">{t("admin.movies.editTitle")}</h1>

          {isLoading && <p className="text-muted-foreground">{t("admin.common.loading")}</p>}
          {isError && <p className="text-destructive">{t("admin.movies.notFound")}</p>}

          {movie && (
            <MovieForm
              initial={movie}
              onSubmit={onSubmit}
              submitLabel={t("admin.movies.saveChanges")}
              pending={update.isPending}
              error={update.error as AxiosError<ApiError> | null}
              onCancel={() => router.push("/admin/movies")}
            />
          )}
        </div>
      </div>
    </main>
  );
}
