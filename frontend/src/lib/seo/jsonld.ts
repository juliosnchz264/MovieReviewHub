import type { Movie } from "@/types/movie";
import type { Series } from "@/types/series";
import type { Review, MovieRatingStats } from "@/types/review";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://movie-review-hub-tau.vercel.app";

type JsonLd = Record<string, unknown>;

export function organizationJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MovieReviewHub",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
  };
}

export function websiteJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "MovieReviewHub",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/movies?title={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

function aggregateRating(stats?: MovieRatingStats | null): JsonLd | undefined {
  if (!stats || stats.count === 0) return undefined;
  return {
    "@type": "AggregateRating",
    ratingValue: stats.average.toFixed(1),
    ratingCount: stats.count,
    bestRating: 10,
    worstRating: 1,
  };
}

function reviewToLd(review: Review): JsonLd {
  return {
    "@type": "Review",
    author: { "@type": "Person", name: review.username },
    datePublished: review.createdAt,
    reviewBody: review.comment ?? undefined,
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.rating,
      bestRating: 10,
      worstRating: 1,
    },
  };
}

export function movieJsonLd(
  movie: Movie,
  stats?: MovieRatingStats | null,
  reviews?: Review[]
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    description: movie.description ?? undefined,
    image: movie.imageUrl ?? undefined,
    genre: movie.genres,
    datePublished: movie.releaseDate ?? undefined,
    url: `${SITE_URL}/movies/${movie.slug}`,
    aggregateRating: aggregateRating(stats),
    review: reviews?.length ? reviews.map(reviewToLd) : undefined,
  };
}

export function seriesJsonLd(
  series: Series,
  stats?: MovieRatingStats | null,
  reviews?: Review[]
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    name: series.title,
    description: series.description ?? undefined,
    image: series.imageUrl ?? undefined,
    genre: series.genres,
    startDate: series.firstAirDate ?? undefined,
    endDate: series.lastAirDate ?? undefined,
    numberOfSeasons: series.numberOfSeasons ?? undefined,
    numberOfEpisodes: series.numberOfEpisodes ?? undefined,
    url: `${SITE_URL}/series/${series.slug}`,
    aggregateRating: aggregateRating(stats),
    review: reviews?.length ? reviews.map(reviewToLd) : undefined,
  };
}
