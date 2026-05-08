package com.moviereviewhub.modules.people.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Subset de TMDB /person que usamos. Listas y populares.
 */
public record TmdbPerson(
        Long id,
        String name,
        @JsonProperty("profile_path") String profilePath,
        @JsonProperty("known_for_department") String knownForDepartment,
        Double popularity
) {}
