package com.moviereviewhub.modules.notification.service.event;

import com.moviereviewhub.modules.reviewsocial.domain.ReviewTargetType;

/**
 * Fired after a like has been persisted on a reply. Listeners run AFTER_COMMIT
 * so a notification failure cannot roll back the like.
 *
 * @param actorId    user who performed the like
 * @param ownerId    author of the liked reply (notification recipient)
 * @param reviewKind MOVIE or SERIES — the kind of review the thread lives on
 * @param reviewId   id of the parent review (for navigation context)
 * @param replyId    id of the liked reply
 */
public record ReplyLikedEvent(
        Long actorId,
        Long ownerId,
        ReviewTargetType reviewKind,
        Long reviewId,
        Long replyId
) {
}
