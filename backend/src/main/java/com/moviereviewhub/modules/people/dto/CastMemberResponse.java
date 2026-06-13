package com.moviereviewhub.modules.people.dto;

/**
 * Cast entry shown on movie/series detail pages. `tmdbPersonId` is the TMDB
 * person id and links to /people/{tmdbPersonId}; the existing PeopleController
 * resolves it live against TMDB.
 */
public record CastMemberResponse(
        Long tmdbPersonId,
        String name,
        String character,
        String profileUrl,
        Integer order
) {
}
