package com.moviereviewhub.modules.reviewsocial.dto;

import com.moviereviewhub.modules.reviewsocial.domain.ReviewTargetType;

import java.time.Instant;

public record ReviewCardResponse(
        Long id,
        ReviewTargetType kind,
        Double rating,
        String comment,
        Long userId,
        String username,
        String userAvatarUrl,
        Long targetId,
        String targetTitle,
        String targetPosterUrl,
        boolean authorFavorited,
        long likeCount,
        long replyCount,
        boolean likedByMe,
        Instant createdAt,
        Instant updatedAt
) {}
