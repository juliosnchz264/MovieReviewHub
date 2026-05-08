import type { Metadata } from "next";
import { SeriesDetailView } from "./SeriesDetailView";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, seriesJsonLd } from "@/lib/seo/jsonld";
import type { Series } from "@/types/series";
import type { MovieRatingStats } from "@/types/review";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://movie-review-hub-tau.vercel.app";

async function fetchSeries(id: string): Promise<Series | null> {
  if (!Number.isFinite(Number(id))) return null;
  try {
    const res = await fetch(`${API_URL}/series/${id}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as Series;
  } catch {
    return null;
  }
}

async function fetchStats(id: string): Promise<MovieRatingStats | null> {
  if (!Number.isFinite(Number(id))) return null;
  try {
    const res = await fetch(`${API_URL}/series/${id}/rating`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as MovieRatingStats;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const series = await fetchSeries(id);

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
  const canonical = `${SITE_URL}/series/${series.id}`;

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
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const seriesId = Number(id);
  const [series, stats] = await Promise.all([fetchSeries(id), fetchStats(id)]);

  return (
    <>
      {series && (
        <JsonLd
          data={[
            seriesJsonLd(series, stats),
            breadcrumbJsonLd([
              { name: "Home", url: SITE_URL },
              { name: "Series", url: `${SITE_URL}/series` },
              { name: series.title, url: `${SITE_URL}/series/${series.id}` },
            ]),
          ]}
        />
      )}
      <SeriesDetailView seriesId={seriesId} />
    </>
  );
}
