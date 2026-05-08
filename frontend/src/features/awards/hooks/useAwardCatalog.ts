import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface AwardEnrichment {
  // tmdbId -> catalogId interno (solo si esta importado)
  catalog: { movies: Record<string, number>; series: Record<string, number> };
  // tmdbId -> URL absoluta de poster fresco de TMDB (omitido si no existe)
  posters: { movies: Record<string, string>; tv: Record<string, string> };
}

/**
 * Combina dos lookups en paralelo:
 *  - catalogo local (movies/series/lookup): para decidir link interno vs externo
 *  - posters TMDB (tmdb/posters): para obtener URLs frescos sin hardcodear paths
 *
 * Ambos toleran fallos silenciosamente — devuelven {} en grupos vacios o
 * cuando el backend no responde. La pagina cae en fallback (icono Trophy)
 * para items sin poster.
 */
export function useAwardCatalog(movieTmdbIds: number[], seriesTmdbIds: number[]) {
  return useQuery({
    queryKey: ["awards", "enrichment", movieTmdbIds.sort(), seriesTmdbIds.sort()],
    staleTime: 30 * 60_000,
    queryFn: async (): Promise<AwardEnrichment> => {
      const movieParam = movieTmdbIds.join(",");
      const seriesParam = seriesTmdbIds.join(",");

      const catalogPromise = Promise.all([
        movieTmdbIds.length === 0
          ? Promise.resolve({} as Record<string, number>)
          : api
              .get<Record<string, number>>("/movies/lookup", {
                params: { tmdbIds: movieParam },
              })
              .then((r) => r.data)
              .catch(() => ({} as Record<string, number>)),
        seriesTmdbIds.length === 0
          ? Promise.resolve({} as Record<string, number>)
          : api
              .get<Record<string, number>>("/series/lookup", {
                params: { tmdbIds: seriesParam },
              })
              .then((r) => r.data)
              .catch(() => ({} as Record<string, number>)),
      ]).then(([movies, series]) => ({ movies, series }));

      const postersPromise = api
        .get<{ movies: Record<string, string>; tv: Record<string, string> }>(
          "/tmdb/posters",
          {
            params: {
              ...(movieTmdbIds.length > 0 ? { movies: movieParam } : {}),
              ...(seriesTmdbIds.length > 0 ? { tv: seriesParam } : {}),
            },
          }
        )
        .then((r) => r.data)
        .catch(() => ({ movies: {}, tv: {} }));

      const [catalog, posters] = await Promise.all([catalogPromise, postersPromise]);
      return { catalog, posters };
    },
  });
}
