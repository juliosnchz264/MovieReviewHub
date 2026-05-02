"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { MovieForm } from "@/features/movies/components/MovieForm";
import { useMovie } from "@/features/movies/hooks/useMovie";
import { useUpdateMovie } from "@/features/movies/hooks/useMovieMutations";
import type { ApiError } from "@/types/auth";
import type { MovieRequest } from "@/types/movie";

export default function EditMoviePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
            ← Back
          </Button>
        </Link>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h1 className="mb-4 text-2xl font-semibold">Edit movie</h1>

          {isLoading && <p className="text-muted-foreground">Loading...</p>}
          {isError && <p className="text-destructive">Movie not found</p>}

          {movie && (
            <MovieForm
              initial={movie}
              onSubmit={onSubmit}
              submitLabel="Save changes"
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
