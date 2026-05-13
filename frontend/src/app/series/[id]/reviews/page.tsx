import type { Metadata } from "next";
import { ReviewsFeedView } from "@/features/reviews/components/ReviewsFeedView";
import { backendApiBase, fetchWithTimeout } from "@/lib/server-api";
import type { Series } from "@/types/series";
import type { ReviewSort } from "@/types/review";

export const dynamic = "force-dynamic";

async function fetchSeries(id: string): Promise<Series | null> {
  if (!Number.isFinite(Number(id))) return null;
  const apiBase = backendApiBase();
  if (!apiBase) return null;
  const res = await fetchWithTimeout(`${apiBase}/series/${id}`, {
    next: { revalidate: 300 },
  });
  if (!res || !res.ok) return null;
  return (await res.json()) as Series;
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
  const series = await fetchSeries(id);
  if (!series) {
    return { title: "Reviews", robots: { index: false } };
  }
  return {
    title: `Reviews — ${series.title}`,
    description: `User reviews for ${series.title}.`,
  };
}

export default async function SeriesReviewsFeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string | string[] }>;
}) {
  const { id } = await params;
  const { sort: sortParam } = await searchParams;
  const seriesId = Number(id);
  const sort = normalizeSort(sortParam);
  const series = await fetchSeries(id);

  return (
    <ReviewsFeedView
      key={sort}
      kind="series"
      targetId={seriesId}
      initialSort={sort}
      targetTitle={series?.title ?? ""}
      targetHref={`/series/${seriesId}`}
    />
  );
}
