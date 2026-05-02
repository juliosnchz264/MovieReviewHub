"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useMyReviews } from "@/features/reviews/hooks/useReviews";
import { useMyFavorites } from "@/features/favorites/hooks/useFavorites";
import { RatingStars } from "@/features/reviews/components/RatingStars";
import { FavoriteButton } from "@/features/favorites/components/FavoriteButton";
import { cn } from "@/lib/utils";

type Tab = "reviews" | "favorites";

export default function ProfilePage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: user } = useCurrentUser();
  const [tab, setTab] = useState<Tab>("reviews");

  useEffect(() => {
    if (!accessToken) router.replace("/login");
  }, [accessToken, router]);

  if (!accessToken) return null;

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {user?.username ?? "Profile"}
            </h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline">Dashboard</Button>
          </Link>
        </div>

        <div className="border-b border-border">
          <nav className="flex gap-1">
            <TabButton active={tab === "reviews"} onClick={() => setTab("reviews")}>
              My reviews
            </TabButton>
            <TabButton active={tab === "favorites"} onClick={() => setTab("favorites")}>
              My favorites
            </TabButton>
          </nav>
        </div>

        {tab === "reviews" && <MyReviewsTab />}
        {tab === "favorites" && <MyFavoritesTab />}
      </div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 text-sm font-medium transition",
        active
          ? "border-b-2 border-primary text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function MyReviewsTab() {
  const { data, isLoading } = useMyReviews();

  if (isLoading) return <p className="text-muted-foreground">Loading...</p>;
  if (!data || data.content.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        You haven&apos;t reviewed any movie yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {data.content.map((review) => (
        <li key={review.id} className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-start justify-between">
            <div>
              <Link
                href={`/movies/${review.movieId}`}
                className="font-medium hover:underline"
              >
                {review.movieTitle}
              </Link>
              <RatingStars value={review.rating} size="sm" readOnly />
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(review.createdAt).toLocaleDateString()}
            </p>
          </div>
          {review.comment && (
            <p className="text-sm leading-relaxed text-foreground/80">{review.comment}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

function MyFavoritesTab() {
  const { data, isLoading } = useMyFavorites();

  if (isLoading) return <p className="text-muted-foreground">Loading...</p>;
  if (!data || data.content.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No favorites yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {data.content.map((movie) => (
        <div
          key={movie.id}
          className="group relative overflow-hidden rounded-xl border border-border bg-card transition hover:shadow-md"
        >
          <FavoriteButton
            movieId={movie.id}
            variant="icon"
            className="absolute right-2 top-2 z-10"
          />
          <Link href={`/movies/${movie.id}`} className="block">
            <div className="relative aspect-2/3 bg-muted">
              {movie.imageUrl ? (
                <Image
                  src={movie.imageUrl}
                  alt={movie.title}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No image
                </div>
              )}
            </div>
            <div className="p-3">
              <h3 className="line-clamp-1 text-sm font-medium">{movie.title}</h3>
              <p className="text-xs text-muted-foreground">
                {movie.genre ?? "—"}
              </p>
            </div>
          </Link>
        </div>
      ))}
    </div>
  );
}
