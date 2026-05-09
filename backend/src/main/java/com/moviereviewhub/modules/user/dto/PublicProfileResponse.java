package com.moviereviewhub.modules.user.dto;

import java.time.Instant;

/**
 * Respuesta publica de perfil. Endpoint sin auth.
 * No expone email, role, provider, providerId, profileCompleted ni timestamps de update.
 * averageMovieScore / averageTvScore vienen ya en escala 0-5 (half-step).
 */
public record PublicProfileResponse(
        Long id,
        String username,
        String avatarUrl,
        String coverUrl,
        String bio,
        Instant memberSince,
        Double averageMovieScore,
        Double averageTvScore,
        long totalMovieReviews,
        long totalTvReviews,
        long totalPublicLists
) {
}
