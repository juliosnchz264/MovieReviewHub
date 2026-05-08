package com.moviereviewhub.modules.tmdb.dto;

import java.util.List;

/**
 * Vista enriquecida que devolvemos al frontend:
 * url completa de poster + lista de generos + flag indicando
 * si ya esta importado en DB local.
 */
public record TmdbMovieView(
        Long tmdbId,
        String title,
        String overview,
        String posterUrl,
        String releaseDate,
        List<String> genres,
        Double voteAverage,
        Integer voteCount,
        boolean alreadyImported,
        Long localMovieId
) {
}
