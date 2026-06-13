import type { Metadata } from "next";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { SeriesDetailView } from "./SeriesDetailView";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, seriesJsonLd } from "@/lib/seo/jsonld";
import { backendApiBase, fetchWithTimeout, safeJson } from "@/lib/server-api";
import { makeServerQueryClient } from "@/lib/query/server-client";
import { reviewKeys } from "@/features/reviews/hooks/queryKeys";
import type { Series } from "@/types/series";
import type { MovieRatingStats } from "@/types/review";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://movie-review-hub-tau.vercel.app";

// Generate on demand; backend cold-start on Render must not block the build.
export const dynamic = "force-dynamic";

// `key` is the canonical slug; the backend also resolves public_id / legacy id.
async function fetchSeries(key: string): Promise<Series | null> {
  const apiBase = backendApiBase();
  if (!apiBase) return null;
  const res = await fetchWithTimeout(`${apiBase}/series/${encodeURIComponent(key)}`, {
    next: { revalidate: 300 },
  });
  return safeJson<Series>(res);
}

async function fetchStats(id: number): Promise<MovieRatingStats | null> {
  const apiBase = backendApiBase();
  if (!apiBase) return null;
  const res = await fetchWithTimeout(`${apiBase}/series/${id}/reviews/stats`, {
    next: { revalidate: 300 },
  });
  return safeJson<MovieRatingStats>(res);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const series = await fetchSeries(slug);

  if (!series) {
    return {
      title: "Series not found",
      robots: { index: false },
    };
  }

  const year = series.firstAirDate ? ` (${series.firstAirDate.slice(0, 4)})` : "";
  const description =
    series.description?.slice(0, 200) ??
    `Reviews and rating for ${series.title}${year}.`;

  const images = series.imageUrl ? [{ url: series.imageUrl, alt: series.title }] : [];
  const canonical = `${SITE_URL}/series/${series.slug}`;

  return {
    title: series.title,
    description,
    alternates: { canonical },
    openGraph: {
      title: series.title,
      description,
      type: "video.tv_show",
      url: canonical,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: series.title,
      description,
      images: series.imageUrl ? [series.imageUrl] : [],
    },
  };
}

export default async function SeriesDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const series = await fetchSeries(slug);
  const seriesId = series?.id ?? Number(slug);
  const stats = series ? await fetchStats(series.id) : null;

  const qc = makeServerQueryClient();
  if (series) qc.setQueryData(["series", "item", seriesId], series);
  if (stats) qc.setQueryData(reviewKeys.stats("series", seriesId), stats);

  return (
    <>
      {series && (
        <JsonLd
          data={[
            seriesJsonLd(series, stats),
            breadcrumbJsonLd([
              { name: "Home", url: SITE_URL },
              { name: "Series", url: `${SITE_URL}/series` },
              { name: series.title, url: `${SITE_URL}/series/${series.slug}` },
            ]),
          ]}
        />
      )}
      <HydrationBoundary state={dehydrate(qc)}>
        <SeriesDetailView seriesId={seriesId} />
      </HydrationBoundary>
    </>
  );
}
