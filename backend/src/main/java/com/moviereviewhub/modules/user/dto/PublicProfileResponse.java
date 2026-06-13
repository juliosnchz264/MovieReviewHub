package com.moviereviewhub.modules.user.dto;

import java.time.Instant;

/**
 * Respuesta publica de perfil. Endpoint sin auth.
 * No expone email, role, provider, providerId, profileCompleted ni timestamps de update.
 * No expone preferencias internas (idioma, pais, timezone). Solo lo que se considera publico.
 * averageMovieScore / averageTvScore vienen ya en escala 0-5 (half-step).
 */
public record PublicProfileResponse(
        Long id,
        String publicId,
        String username,
        String handle,
        String avatarUrl,
        String coverUrl,
        String bio,
        String themeColor,
        SocialLinks social,
        Instant memberSince,
        Double averageMovieScore,
        Double averageTvScore,
        long totalMovieReviews,
        long totalTvReviews,
        long totalPublicLists
) {
    public record SocialLinks(
            String facebook,
            String instagram,
            String twitter,
            String tiktok
    ) {
    }
}
