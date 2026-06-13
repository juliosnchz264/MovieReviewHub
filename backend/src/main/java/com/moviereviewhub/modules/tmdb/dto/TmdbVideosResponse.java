package com.moviereviewhub.modules.tmdb.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TmdbVideosResponse(
        Long id,
        List<TmdbVideoEntry> results
) {
}
