import type { Metadata } from "next";
import { MovieDetailView } from "./MovieDetailView";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, movieJsonLd } from "@/lib/seo/jsonld";
import type { Movie } from "@/types/movie";
import type { MovieRatingStats } from "@/types/review";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://movie-review-hub-tau.vercel.app";

async function fetchMovie(id: string): Promise<Movie | null> {
  if (!Number.isFinite(Number(id))) return null;
  try {
    const res = await fetch(`${API_URL}/movies/${id}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as Movie;
  } catch {
    return null;
  }
}

async function fetchStats(id: string): Promise<MovieRatingStats | null> {
  if (!Number.isFinite(Number(id))) return null;
  try {
    const res = await fetch(`${API_URL}/movies/${id}/reviews/stats`, {
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
  const movie = await fetchMovie(id);

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
  const canonical = `${SITE_URL}/movies/${movie.id}`;

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
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const movieId = Number(id);
  const [movie, stats] = await Promise.all([fetchMovie(id), fetchStats(id)]);

  return (
    <>
      {movie && (
        <JsonLd
          data={[
            movieJsonLd(movie, stats),
            breadcrumbJsonLd([
              { name: "Home", url: SITE_URL },
              { name: "Movies", url: `${SITE_URL}/movies` },
              { name: movie.title, url: `${SITE_URL}/movies/${movie.id}` },
            ]),
          ]}
        />
      )}
      <MovieDetailView movieId={movieId} />
    </>
  );
}
