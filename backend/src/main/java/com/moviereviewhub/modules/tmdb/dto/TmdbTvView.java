package com.moviereviewhub.modules.tmdb.dto;

import java.util.List;

/**
 * Vista enriquecida de una serie TMDB para frontend admin:
 * URL completa de poster, lista de generos, flag indicando si ya esta importada.
 */
public record TmdbTvView(
        Long tmdbId,
        String title,
        String overview,
        String posterUrl,
        String backdropUrl,
        String firstAirDate,
        String lastAirDate,
        Integer numberOfSeasons,
        Integer numberOfEpisodes,
        List<String> genres,
        Double voteAverage,
        Integer voteCount,
        boolean alreadyImported,
        Long localSeriesId
) {
}
