"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { MovieRow } from "@/features/movies/components/MovieRow";
import { useTrending, useTopRated } from "@/features/movies/hooks/useDiscover";
import { useAuthStore } from "@/store/auth";

export default function Home() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const trending = useTrending(12);
  const topRated = useTopRated(12, 1);

  return (
    <main className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-semibold tracking-tight">MovieReviewHub</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link href="/movies">Browse</Link>
            </Button>
            {accessToken ? (
              <Button asChild size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="outline" size="sm">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/register">Register</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="border-b border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 px-4 py-12">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Discover, rate, and remember the movies you love.
          </h2>
          <p className="max-w-2xl text-muted-foreground">
            A movie catalog with reviews, ratings, and favorites — backed by TMDB.
          </p>
          <div className="flex gap-2 pt-2">
            <Button asChild size="lg">
              <Link href="/movies">Browse catalog</Link>
            </Button>
            {!accessToken && (
              <Button asChild variant="outline" size="lg">
                <Link href="/register">Create account</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8">
        <MovieRow
          title="Trending now"
          subtitle="Most reviewed and favorited in the last 30 days"
          movies={trending.data}
          isLoading={trending.isLoading}
          emptyText="No activity yet — be the first to review a movie."
        />

        <MovieRow
          title="Top rated"
          subtitle="Highest average rating in the catalog"
          movies={topRated.data}
          isLoading={topRated.isLoading}
          emptyText="Not enough ratings yet."
        />
      </div>
    </main>
  );
}
