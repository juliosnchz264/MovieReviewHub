package com.moviereviewhub.modules.people.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/**
 * Raw shape of /movie/{id}/credits and /tv/{id}/credits.
 * Series also expose /tv/{id}/aggregate_credits with richer character data,
 * but flat credits is enough for the top-cast strip.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record TmdbMovieCredits(
        Long id,
        List<TmdbCastEntry> cast
) {
}
