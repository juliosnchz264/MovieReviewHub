import type { MetadataRoute } from "next";
import type { PagedResponse } from "@/types/movie";
import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://movie-review-hub-tau.vercel.app";

// Server-side fetch needs absolute backend origin. NEXT_PUBLIC_API_URL puede
// ser relativo (proxy via Vercel rewrites), asi que preferimos BACKEND_ORIGIN.
function backendApiBase(): string | null {
  const origin = process.env.BACKEND_ORIGIN;
  if (origin) return `${origin.replace(/\/$/, "")}/api/v1`;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl && /^https?:\/\//i.test(apiUrl)) return apiUrl;
  return null;
}

const PAGE_SIZE = 100;
const MAX_PAGES = 20;
const FETCH_TIMEOUT_MS = 8000;

// Genera bajo demanda; no bloquees el build con cold-start del backend.
export const dynamic = "force-dynamic";
export const revalidate = 86400;

async function fetchAllPages<T>(apiBase: string, endpoint: string): Promise<T[]> {
  const all: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(
        `${apiBase}${endpoint}?page=${page}&size=${PAGE_SIZE}`,
        { next: { revalidate: 86400 }, signal: controller.signal }
      );
      if (!res.ok) break;
      const data: PagedResponse<T> = await res.json();
      all.push(...data.content);
      if (data.last) break;
    } catch {
      break;
    } finally {
      clearTimeout(timeout);
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

  const apiBase = backendApiBase();
  const [movies, series] = apiBase
    ? await Promise.all([
        fetchAllPages<Movie>(apiBase, "/movies"),
        fetchAllPages<Series>(apiBase, "/series"),
      ])
    : [[], []];

  const movieRoutes: MetadataRoute.Sitemap = movies.map((m) => ({
    url: `${SITE_URL}/movies/${m.slug}`,
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
