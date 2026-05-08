import type { MetadataRoute } from "next";
import type { PagedResponse } from "@/types/movie";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://movie-review-hub-tau.vercel.app";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

const PAGE_SIZE = 100;
const MAX_PAGES = 20;

export const revalidate = 86400;

async function fetchAllPages<T>(endpoint: string): Promise<T[]> {
  const all: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    try {
      const res = await fetch(
        `${API_URL}${endpoint}?page=${page}&size=${PAGE_SIZE}`,
        { next: { revalidate: 86400 } }
      );
      if (!res.ok) break;
      const data: PagedResponse<T> = await res.json();
      all.push(...data.content);
      if (data.last) break;
    } catch {
      break;
    }
  }
  return all;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/movies`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/series`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/people`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/awards`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  const [movies, series] = await Promise.all([
    fetchAllPages<Movie>("/movies"),
    fetchAllPages<Series>("/series"),
  ]);

  const movieRoutes: MetadataRoute.Sitemap = movies.map((m) => ({
    url: `${SITE_URL}/movies/${m.id}`,
    lastModified: m.updatedAt ? new Date(m.updatedAt) : now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const seriesRoutes: MetadataRoute.Sitemap = series.map((s) => ({
    url: `${SITE_URL}/series/${s.id}`,
    lastModified: s.updatedAt ? new Date(s.updatedAt) : now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...movieRoutes, ...seriesRoutes];
}
