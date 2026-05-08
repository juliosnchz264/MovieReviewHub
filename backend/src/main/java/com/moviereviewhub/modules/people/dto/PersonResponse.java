package com.moviereviewhub.modules.people.dto;

/**
 * Versión "card" — usada en grids/listas.
 */
public record PersonResponse(
        Long tmdbId,
        String name,
        String profileUrl,        // URL absoluta del retrato (puede ser null)
        String knownForDepartment // "Acting" / "Directing" / etc.
) {}
