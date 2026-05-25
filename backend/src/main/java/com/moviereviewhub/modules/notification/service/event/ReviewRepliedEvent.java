package com.moviereviewhub.modules.notification.service.event;

import com.moviereviewhub.modules.reviewsocial.domain.ReviewTargetType;

/**
 * Fired after a reply has been persisted on a review. Listeners run
 * AFTER_COMMIT so a notification failure cannot kill the reply.
 *
 * @param actorId   user who wrote the reply
 * @param ownerId   author of the parent review (notification recipient)
 * @param kind      MOVIE or SERIES review
 * @param reviewId  id of the parent review
 * @param replyId   id of the newly created reply
 * @param preview   first chars of the reply body (already trimmed by service)
 */
public record ReviewRepliedEvent(
        Long actorId,
        Long ownerId,
        ReviewTargetType kind,
        Long reviewId,
        Long replyId,
        String preview
) {
}
