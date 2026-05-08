package com.moviereviewhub.modules.people.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Vista de detalle: incluye biografía y créditos top.
 */
public record PersonDetailResponse(
        Long tmdbId,
        String name,
        String biography,
        LocalDate birthday,
        LocalDate deathday,
        String placeOfBirth,
        String profileUrl,
        String knownForDepartment,
        List<String> alsoKnownAs,
        List<PersonCreditResponse> credits
) {}
