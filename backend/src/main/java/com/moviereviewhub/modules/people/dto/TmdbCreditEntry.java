package com.moviereviewhub.modules.people.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Entrada de credits combinados (movie + tv). El campo media_type discrimina.
 */
public record TmdbCreditEntry(
        Long id,
        @JsonProperty("media_type") String mediaType,  // "movie" o "tv"
        String title,                                  // movies
        String name,                                   // tv
        String character,
        String job,
        @JsonProperty("poster_path") String posterPath,
        @JsonProperty("release_date") String releaseDate,    // movies "yyyy-MM-dd"
        @JsonProperty("first_air_date") String firstAirDate, // tv
        @JsonProperty("vote_average") Double voteAverage,
        Double popularity
) {}
