package com.moviereviewhub.modules.tmdb.dto;

import java.util.List;

/**
 * Outcome of the auto-link job. linked = local rows that now carry a tmdb_id
 * (and inherited backdrop / poster / genres if those were missing). skipped =
 * rows we could not match confidently. failures includes the local row id +
 * reason so the admin can fix the edge cases manually.
 */
public record AutoLinkResult(
        int linked,
        int skipped,
        List<Failure> failures
) {
    public record Failure(Long localId, String title, String reason) {}
}
