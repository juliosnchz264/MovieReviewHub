import type { Metadata } from "next";
import { ReviewsFeedView } from "@/features/reviews/components/ReviewsFeedView";
import { backendApiBase, fetchWithTimeout, safeJson } from "@/lib/server-api";
import type { Movie } from "@/types/movie";
import type { ReviewSort } from "@/types/review";

export const dynamic = "force-dynamic";

async function fetchMovie(id: string): Promise<Movie | null> {
  if (!Number.isFinite(Number(id))) return null;
  const apiBase = backendApiBase();
  if (!apiBase) return null;
  const res = await fetchWithTimeout(`${apiBase}/movies/${id}`, {
    next: { revalidate: 300 },
  });
  return safeJson<Movie>(res);
}

function normalizeSort(input: string | string[] | undefined): ReviewSort {
  const v = Array.isArray(input) ? input[0] : input;
  return v === "popular" ? "popular" : "recent";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const movie = await fetchMovie(id);
  if (!movie) {
    return { title: "Reviews", robots: { index: false } };
  }
  return {
    title: `Reviews — ${movie.title}`,
    description: `User reviews for ${movie.title}.`,
  };
}

export default async function MovieReviewsFeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string | string[] }>;
}) {
  const { id } = await params;
  const { sort: sortParam } = await searchParams;
  const movieId = Number(id);
  const sort = normalizeSort(sortParam);
  const movie = await fetchMovie(id);

  return (
    <ReviewsFeedView
      key={sort}
      kind="movie"
      targetId={movieId}
      initialSort={sort}
      targetTitle={movie?.title ?? ""}
      targetHref={`/movies/${movieId}`}
    />
  );
}
