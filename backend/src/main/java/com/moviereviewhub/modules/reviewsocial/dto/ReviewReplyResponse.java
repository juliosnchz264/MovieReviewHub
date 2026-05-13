package com.moviereviewhub.modules.reviewsocial.dto;

import com.moviereviewhub.modules.reviewsocial.domain.ReviewReply;

import java.time.Instant;

public record ReviewReplyResponse(
        Long id,
        Long userId,
        String username,
        String userAvatarUrl,
        String body,
        Instant createdAt,
        Instant updatedAt,
        boolean canEdit,
        boolean canDelete
) {
    public static ReviewReplyResponse from(ReviewReply r, Long currentUserId, boolean isAdmin) {
        boolean owner = currentUserId != null && currentUserId.equals(r.getUser().getId());
        return new ReviewReplyResponse(
                r.getId(),
                r.getUser().getId(),
                r.getUser().getUsername(),
                r.getUser().getAvatarUrl(),
                r.getBody(),
                r.getCreatedAt(),
                r.getUpdatedAt(),
                owner,
                owner || isAdmin
        );
    }
}
