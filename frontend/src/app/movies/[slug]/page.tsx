import type { Metadata } from "next";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { MovieDetailView } from "./MovieDetailView";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, movieJsonLd } from "@/lib/seo/jsonld";
import { backendApiBase, fetchWithTimeout, safeJson } from "@/lib/server-api";
import { makeServerQueryClient } from "@/lib/query/server-client";
import { reviewKeys } from "@/features/reviews/hooks/queryKeys";
import type { Movie } from "@/types/movie";
import type { MovieRatingStats } from "@/types/review";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://movie-review-hub-tau.vercel.app";

// Generate on demand; backend cold-start on Render must not block the build.
export const dynamic = "force-dynamic";

// `key` is the canonical slug, but the backend also resolves a public_id or a
// legacy numeric id, so old links keep working through this same route.
async function fetchMovie(key: string): Promise<Movie | null> {
  const apiBase = backendApiBase();
  if (!apiBase) return null;
  const res = await fetchWithTimeout(`${apiBase}/movies/${encodeURIComponent(key)}`, {
    next: { revalidate: 300 },
  });
  return safeJson<Movie>(res);
}

async function fetchStats(id: number): Promise<MovieRatingStats | null> {
  const apiBase = backendApiBase();
  if (!apiBase) return null;
  const res = await fetchWithTimeout(`${apiBase}/movies/${id}/reviews/stats`, {
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
  const movie = await fetchMovie(slug);

  if (!movie) {
    return {
      title: "Movie not found",
      robots: { index: false },
    };
  }

  const description =
    movie.description?.slice(0, 200) ??
    `Reviews and rating for ${movie.title}${movie.releaseDate ? ` (${movie.releaseDate.slice(0, 4)})` : ""}.`;

  const images = movie.imageUrl ? [{ url: movie.imageUrl, alt: movie.title }] : [];
  const canonical = `${SITE_URL}/movies/${movie.slug}`;

  return {
    title: movie.title,
    description,
    alternates: { canonical },
    openGraph: {
      title: movie.title,
      description,
      type: "video.movie",
      url: canonical,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: movie.title,
      description,
      images: movie.imageUrl ? [movie.imageUrl] : [],
    },
  };
}

export default async function MovieDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const movie = await fetchMovie(slug);
  const movieId = movie?.id ?? Number(slug);
  const stats = movie ? await fetchStats(movie.id) : null;

  // Seed the client QueryClient with the SSR payload so the hooks in
  // MovieDetailView hit cache instead of re-fetching on hydrate.
  const qc = makeServerQueryClient();
  if (movie) qc.setQueryData(["movie", movieId], movie);
  if (stats) qc.setQueryData(reviewKeys.stats("movie", movieId), stats);

  return (
    <>
      {movie && (
        <JsonLd
          data={[
            movieJsonLd(movie, stats),
            breadcrumbJsonLd([
              { name: "Home", url: SITE_URL },
              { name: "Movies", url: `${SITE_URL}/movies` },
              { name: movie.title, url: `${SITE_URL}/movies/${movie.slug}` },
            ]),
          ]}
        />
      )}
      <HydrationBoundary state={dehydrate(qc)}>
        <MovieDetailView movieId={movieId} />
      </HydrationBoundary>
    </>
  );
}
