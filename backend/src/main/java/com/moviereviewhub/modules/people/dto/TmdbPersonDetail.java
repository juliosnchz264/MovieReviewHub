package com.moviereviewhub.modules.people.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDate;

public record TmdbPersonDetail(
        Long id,
        String name,
        String biography,
        @JsonProperty("birthday") LocalDate birthday,
        @JsonProperty("deathday") LocalDate deathday,
        @JsonProperty("place_of_birth") String placeOfBirth,
        @JsonProperty("profile_path") String profilePath,
        @JsonProperty("known_for_department") String knownForDepartment,
        @JsonProperty("also_known_as") java.util.List<String> alsoKnownAs,
        Double popularity
) {}
