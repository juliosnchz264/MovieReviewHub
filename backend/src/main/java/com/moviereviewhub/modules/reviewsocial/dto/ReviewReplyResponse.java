package com.moviereviewhub.modules.reviewsocial.dto;

import com.moviereviewhub.modules.reviewsocial.domain.ReviewReply;

import java.time.Instant;

public record ReviewReplyResponse(
        Long id,
        Long userId,
        String username,
        String userAvatarUrl,
        String body,
        Long parentReplyId,
        Long rootReplyId,
        int depth,
        int childCount,
        long likeCount,
        boolean likedByMe,
        Instant createdAt,
        Instant updatedAt,
        boolean canEdit,
        boolean canDelete,
        boolean deleted
) {
    /**
     * Build with engagement + thread metadata. likeCount/likedByMe/childCount
     * come from batched lookups in the service layer to avoid an N+1 across
     * a reply page.
     *
     * A soft-deleted reply may still be returned when it anchors a live
     * sub-thread; in that case the body is suppressed and edit/delete are
     * disabled so the client renders a tombstone.
     */
    public static ReviewReplyResponse from(
            ReviewReply r, Long currentUserId, boolean isAdmin,
            long likeCount, boolean likedByMe, int childCount) {
        boolean owner = currentUserId != null && currentUserId.equals(r.getUser().getId());
        boolean deleted = r.isDeleted();
        Short d = r.getDepth();
        return new ReviewReplyResponse(
                r.getId(),
                r.getUser().getId(),
                r.getUser().getUsername(),
                r.getUser().getAvatarUrl(),
                deleted ? null : r.getBody(),
                r.getParentReplyId(),
                r.getRootReplyId(),
                d == null ? 0 : d.intValue(),
                childCount,
                likeCount,
                likedByMe,
                r.getCreatedAt(),
                r.getUpdatedAt(),
                !deleted && owner,
                !deleted && (owner || isAdmin),
                deleted
        );
    }

    /** Zero-engagement variant used for newly-created replies. */
    public static ReviewReplyResponse from(ReviewReply r, Long currentUserId, boolean isAdmin) {
        return from(r, currentUserId, isAdmin, 0L, false, 0);
    }
}
