package com.moviereviewhub.modules.people.dto;

import java.util.List;

public record TmdbCreditsResponse(
        Long id,
        List<TmdbCreditEntry> cast,
        List<TmdbCreditEntry> crew
) {}
