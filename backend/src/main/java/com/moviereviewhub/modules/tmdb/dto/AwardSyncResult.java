package com.moviereviewhub.modules.tmdb.dto;

import java.util.List;
import java.util.Map;

public record AwardSyncResult(
        Counts imported,
        Counts skipped,
        List<Failure> failed,
        Mapping mapping
) {
    public record Counts(int movies, int series) {}
    public record Failure(Long tmdbId, String mediaType, String error) {}
    public record Mapping(Map<Long, Long> movies, Map<Long, Long> series) {}
}
