package com.moviereviewhub.modules.notification.service.event;

import com.moviereviewhub.modules.reviewsocial.domain.ReviewTargetType;

import java.util.Set;

/**
 * Fired AFTER_COMMIT when a new reply lands in a thread that has multiple
 * participants. The listener fans out one notification per participant in
 * {@code recipientIds}; grouping at the storage layer collapses repeated
 * events on the same thread into a single bell row while it remains unread.
 *
 * @param actorId      user who wrote the triggering reply
 * @param recipientIds prior thread participants (excluding the actor and
 *                     anyone who already receives REVIEW_REPLIED or
 *                     REPLY_ANSWERED for this same event)
 * @param reviewKind   MOVIE or SERIES — kind of review the thread sits on
 * @param reviewId     id of the root review
 * @param replyId      id of the newly created reply (notification target)
 * @param preview      first chars of the new reply body
 */
public record ThreadActivityEvent(
        Long actorId,
        Set<Long> recipientIds,
        ReviewTargetType reviewKind,
        Long reviewId,
        Long replyId,
        String preview
) {
}
