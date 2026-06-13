"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { MovieForm } from "@/features/movies/components/MovieForm";
import { useCreateMovie } from "@/features/movies/hooks/useMovieMutations";
import { useTranslate } from "@/hooks/useTranslate";
import type { ApiError } from "@/types/auth";
import type { MovieRequest } from "@/types/movie";

export default function NewMoviePage() {
  const t = useTranslate();
  const router = useRouter();
  const create = useCreateMovie();

  async function onSubmit(payload: MovieRequest) {
    create.mutate(payload, {
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
          <h1 className="mb-4 text-2xl font-semibold">{t("admin.movies.newTitle")}</h1>
          <MovieForm
            onSubmit={onSubmit}
            submitLabel={t("admin.movies.create")}
            pending={create.isPending}
            error={create.error as AxiosError<ApiError> | null}
            onCancel={() => router.push("/admin/movies")}
          />
        </div>
      </div>
    </main>
  );
}
