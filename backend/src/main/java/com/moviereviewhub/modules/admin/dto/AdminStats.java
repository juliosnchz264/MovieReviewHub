package com.moviereviewhub.modules.admin.dto;

public record AdminStats(
        long totalUsers,
        long activeUsers,
        long bannedUsers,
        long admins,
        long totalMovies,
        long totalReviews,
        long totalFavorites
) {
}
