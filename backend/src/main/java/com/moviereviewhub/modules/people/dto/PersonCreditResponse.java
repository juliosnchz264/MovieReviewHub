package com.moviereviewhub.modules.people.dto;

/**
 * Crédito de una persona en una película o serie. El cliente discrimina por mediaType.
 */
public record PersonCreditResponse(
        Long tmdbId,
        String mediaType,    // "movie" o "tv"
        String title,
        String posterUrl,    // URL absoluta o null
        String character,    // null si es crew
        String job,          // null si es cast
        String releaseDate,  // ISO yyyy-MM-dd o null
        Double voteAverage
) {}
