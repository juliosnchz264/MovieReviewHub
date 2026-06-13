package com.moviereviewhub.modules.tmdb.dto;

/**
 * Single trailer surfaced to the frontend. Always YouTube; the key is
 * validated against {@code ^[A-Za-z0-9_-]{6,16}$} before this is returned so
 * the client can embed it unconditionally.
 */
public record TrailerResponse(
        String youtubeKey,
        String name,
        String type,
        boolean official
) {
}
