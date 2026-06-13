import type { Metadata } from "next";
import { ReviewsFeedView } from "@/features/reviews/components/ReviewsFeedView";
import { backendApiBase, fetchWithTimeout, safeJson } from "@/lib/server-api";
import type { Series } from "@/types/series";
import type { ReviewSort } from "@/types/review";

export const dynamic = "force-dynamic";

async function fetchSeries(key: string): Promise<Series | null> {
  const apiBase = backendApiBase();
  if (!apiBase) return null;
  const res = await fetchWithTimeout(`${apiBase}/series/${encodeURIComponent(key)}`, {
    next: { revalidate: 300 },
  });
  return safeJson<Series>(res);
}

function normalizeSort(input: string | string[] | undefined): ReviewSort {
  const v = Array.isArray(input) ? input[0] : input;
  return v === "popular" ? "popular" : "recent";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const series = await fetchSeries(slug);
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
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string | string[] }>;
}) {
  const { slug } = await params;
  const { sort: sortParam } = await searchParams;
  const sort = normalizeSort(sortParam);
  const series = await fetchSeries(slug);
  const seriesId = series?.id ?? Number(slug);

  return (
    <ReviewsFeedView
      key={sort}
      kind="series"
      targetId={seriesId}
      initialSort={sort}
      targetTitle={series?.title ?? ""}
      targetHref={`/series/${series?.slug ?? slug}`}
    />
  );
}
