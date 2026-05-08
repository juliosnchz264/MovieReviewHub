package com.moviereviewhub.modules.people.dto;

import java.util.List;

public record TmdbPersonSearchResponse(
        Integer page,
        List<TmdbPerson> results,
        @com.fasterxml.jackson.annotation.JsonProperty("total_pages") Integer totalPages,
        @com.fasterxml.jackson.annotation.JsonProperty("total_results") Integer totalResults
) {}
