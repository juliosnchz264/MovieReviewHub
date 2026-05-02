import type { Metadata } from "next";
import { MovieDetailView } from "./MovieDetailView";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

interface MoviePayload {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  genre: string | null;
  releaseDate: string | null;
}

async function fetchMovie(id: string): Promise<MoviePayload | null> {
  if (!Number.isFinite(Number(id))) return null;
  try {
    const res = await fetch(`${API_URL}/movies/${id}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as MoviePayload;
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

  return {
    title: movie.title,
    description,
    openGraph: {
      title: movie.title,
      description,
      type: "video.movie",
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
  return <MovieDetailView movieId={movieId} />;
}
