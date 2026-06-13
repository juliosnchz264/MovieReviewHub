package com.moviereviewhub.modules.tmdb.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Entry from /movie/{id}/videos and /tv/{id}/videos.
 *  - `site` is "YouTube" or "Vimeo" (we only embed YouTube).
 *  - `type` is the TMDB taxonomy: "Trailer", "Teaser", "Clip", "Featurette", etc.
 *  - `official` flags vendor-uploaded content.
 *  - `key` is the YouTube video id (constrained format).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record TmdbVideoEntry(
        String id,
        String name,
        String key,
        String site,
        String type,
        Boolean official,
        Integer size,
        String iso6391
) {
}
