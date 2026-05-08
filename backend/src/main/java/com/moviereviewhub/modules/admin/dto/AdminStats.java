package com.moviereviewhub.modules.admin.dto;

public record AdminStats(
        long totalUsers,
        long activeUsers,
        long bannedUsers,
        long admins,
        long totalMovies,
        long totalSeries,
        long totalReviews,
        long totalSeriesReviews,
        long totalFavorites,
        long totalSeriesFavorites
) {
}
