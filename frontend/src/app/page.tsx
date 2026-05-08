"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { MovieRow } from "@/features/movies/components/MovieRow";
import { SeriesRow } from "@/features/series/components/SeriesRow";
import { useTrending, useTopRated } from "@/features/movies/hooks/useDiscover";
import {
  useTrendingSeries,
  useTopRatedSeries,
} from "@/features/series/hooks/useDiscoverSeries";
import { useAuthStore } from "@/store/auth";
import { useTranslate } from "@/hooks/useTranslate";

export default function Home() {
  const t = useTranslate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const trending = useTrending(12);
  const topRated = useTopRated(12, 1);
  const trendingSeries = useTrendingSeries(12);
  const topRatedSeries = useTopRatedSeries(12, 1);

  return (
    <>
      <Navbar />

      <section className="border-b border-border bg-linear-to-b from-secondary/40 to-background">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-4 px-4 py-12 sm:py-16">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            {t("home.heroTitle")}
          </h2>
          <p className="max-w-2xl text-muted-foreground sm:text-lg">
            {t("home.heroSubtitle")}
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild size="lg">
              <Link href="/movies">{t("home.ctaBrowse")}</Link>
            </Button>
            {!accessToken && (
              <Button asChild variant="outline" size="lg">
                <Link href="/register">{t("home.ctaCreate")}</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl space-y-10 px-4 py-10">
        <MovieRow
          title={t("home.trendingTitle")}
          subtitle={t("home.trendingSubtitle")}
          movies={trending.data}
          isLoading={trending.isLoading}
          emptyText={t("home.trendingEmpty")}
        />

        <MovieRow
          title={t("home.topRatedTitle")}
          subtitle={t("home.topRatedSubtitle")}
          movies={topRated.data}
          isLoading={topRated.isLoading}
          emptyText={t("home.topRatedEmpty")}
        />

        <SeriesRow
          title={t("series.trendingTitle")}
          subtitle={t("series.trendingSubtitle")}
          items={trendingSeries.data}
          isLoading={trendingSeries.isLoading}
          emptyText={t("home.trendingEmpty")}
        />

        <SeriesRow
          title={t("series.topRatedTitle")}
          subtitle={t("series.topRatedSubtitle")}
          items={topRatedSeries.data}
          isLoading={topRatedSeries.isLoading}
          emptyText={t("home.topRatedEmpty")}
        />
      </div>
    </>
  );
}
