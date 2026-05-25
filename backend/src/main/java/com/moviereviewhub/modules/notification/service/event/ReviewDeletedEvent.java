package com.moviereviewhub.modules.notification.service.event;

import com.moviereviewhub.modules.reviewsocial.domain.ReviewTargetType;

/**
 * Fired after a review is soft-deleted. Listeners clean up any notifications
 * that pointed at it (target or context) so the bell does not surface
 * tombstones.
 */
public record ReviewDeletedEvent(
        ReviewTargetType kind,
        Long reviewId
) {
}
