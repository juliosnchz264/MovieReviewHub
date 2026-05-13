package com.moviereviewhub.modules.reviewsocial.dto;

import java.time.Instant;

public record ReviewCardSource(
        Long id,
        int storedRating,
        String comment,
        Instant createdAt,
        Instant updatedAt,
        Long authorId,
        String authorUsername,
        String authorAvatarUrl
) {}
