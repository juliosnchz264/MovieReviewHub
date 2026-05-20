"use client";

import { Navbar } from "@/components/navbar";
import { HeroVideo } from "@/features/home/components/HeroVideo";
import { MovieRow } from "@/features/movies/components/MovieRow";
import { SeriesRow } from "@/features/series/components/SeriesRow";
import { useTrending, useTopRated } from "@/features/movies/hooks/useDiscover";
import {
  useTrendingSeries,
  useTopRatedSeries,
} from "@/features/series/hooks/useDiscoverSeries";
import { useTranslate } from "@/hooks/useTranslate";

export default function Home() {
  const t = useTranslate();
  const trending = useTrending(12);
  const topRated = useTopRated(12, 1);
  const trendingSeries = useTrendingSeries(12);
  const topRatedSeries = useTopRatedSeries(12, 1);

  return (
    <>
      <Navbar />

      <HeroVideo
        ariaLabel={t("home.heroVideoAlt")}
        title={t("home.heroMovieTitle")}
        genre={t("home.heroMovieGenre")}
        ctaLabel={t("home.heroCtaWatch")}
        ctaHref="/movies/215"
      />

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
