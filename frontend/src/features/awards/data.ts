/**
 * Lista curada de premios destacados — Oscars / Globes / Emmys ultimos años.
 *
 * Los posters NO se hardcodean — se piden a TMDB en runtime via
 * GET /api/v1/tmdb/posters. TMDB rota el archivo del poster cuando sale uno
 * nuevo, asi que cualquier path hardcodeado se rompe con el tiempo. Solo
 * mantenemos tmdbId + mediaType, que son estables.
 *
 * Fuente: oficial — verificado contra https://www.oscars.org/oscars/ceremonies
 */
export interface AwardEntry {
  ceremony: string; // "Oscars" | "Golden Globes" | "Emmys"
  category: string; // "Best Picture" / "Best Drama Series" / etc.
  year: number;     // año de la ceremonia
  winner: AwardItem;
}

export interface AwardItem {
  title: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
}

export const awards: AwardEntry[] = [
  {
    ceremony: "Oscars",
    category: "Best Picture",
    year: 2025,
    winner: { title: "Anora", tmdbId: 1064213, mediaType: "movie" },
  },
  {
    ceremony: "Oscars",
    category: "Best Picture",
    year: 2024,
    winner: { title: "Oppenheimer", tmdbId: 872585, mediaType: "movie" },
  },
  {
    ceremony: "Oscars",
    category: "Best Picture",
    year: 2023,
    winner: { title: "Everything Everywhere All at Once", tmdbId: 545611, mediaType: "movie" },
  },
  {
    ceremony: "Oscars",
    category: "Best Picture",
    year: 2022,
    winner: { title: "CODA", tmdbId: 776503, mediaType: "movie" },
  },
  {
    ceremony: "Oscars",
    category: "Best Picture",
    year: 2021,
    winner: { title: "Nomadland", tmdbId: 581734, mediaType: "movie" },
  },
  {
    ceremony: "Oscars",
    category: "Best Picture",
    year: 2020,
    winner: { title: "Parasite", tmdbId: 496243, mediaType: "movie" },
  },
  {
    ceremony: "Golden Globes",
    category: "Best Drama Series",
    year: 2025,
    winner: { title: "Shōgun", tmdbId: 126308, mediaType: "tv" },
  },
  {
    ceremony: "Emmys",
    category: "Outstanding Drama Series",
    year: 2024,
    winner: { title: "Shōgun", tmdbId: 126308, mediaType: "tv" },
  },
  {
    ceremony: "Emmys",
    category: "Outstanding Drama Series",
    year: 2023,
    winner: { title: "Succession", tmdbId: 76331, mediaType: "tv" },
  },
  {
    ceremony: "Emmys",
    category: "Outstanding Drama Series",
    year: 2022,
    winner: { title: "Succession", tmdbId: 76331, mediaType: "tv" },
  },
];
