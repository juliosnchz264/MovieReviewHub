import type { Metadata } from "next";
import { ReviewDetailView } from "@/features/reviews/components/ReviewDetailView";
import { backendApiBase, fetchWithTimeout } from "@/lib/server-api";
import type { ReviewCard } from "@/types/review";

export const dynamic = "force-dynamic";

async function fetchReview(id: string): Promise<ReviewCard | null> {
  if (!Number.isFinite(Number(id))) return null;
  const apiBase = backendApiBase();
  if (!apiBase) return null;
  const res = await fetchWithTimeout(`${apiBase}/reviews/${id}`, {
    next: { revalidate: 60 },
  });
  if (!res || !res.ok) return null;
  return (await res.json()) as ReviewCard;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const review = await fetchReview(id);
  if (!review) {
    return { title: "Review not found", robots: { index: false } };
  }
  return {
    title: `${review.username}'s review of ${review.targetTitle}`,
    description:
      review.comment?.slice(0, 200) ??
      `${review.username} rated ${review.targetTitle} ${review.rating}/5.`,
  };
}

export default async function MovieReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReviewDetailView kind="movie" reviewId={Number(id)} />;
}
