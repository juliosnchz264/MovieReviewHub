package com.moviereviewhub.modules.reviewsocial.dto;

import com.moviereviewhub.modules.reviewsocial.domain.ReviewTargetType;

public record LikeStateResponse(
        Long reviewId,
        ReviewTargetType kind,
        boolean likedByMe,
        long likeCount
) {}
