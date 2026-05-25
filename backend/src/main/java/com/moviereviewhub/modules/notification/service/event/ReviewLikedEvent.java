package com.moviereviewhub.modules.notification.service.event;

import com.moviereviewhub.modules.reviewsocial.domain.ReviewTargetType;

/**
 * Fired after a like has been persisted. Listeners run AFTER_COMMIT so a
 * downstream failure (e.g. notification write) cannot roll back the like.
 *
 * @param actorId   user who performed the like
 * @param ownerId   author of the liked review (notification recipient)
 * @param kind      MOVIE or SERIES review
 * @param reviewId  id of the review that was liked
 */
public record ReviewLikedEvent(
        Long actorId,
        Long ownerId,
        ReviewTargetType kind,
        Long reviewId
) {
}
