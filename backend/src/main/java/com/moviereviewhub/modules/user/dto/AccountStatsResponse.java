package com.moviereviewhub.modules.user.dto;

import java.time.Instant;

public record AccountStatsResponse(
        long totalReviews,
        long totalFavorites,
        Instant memberSince
) {
}
