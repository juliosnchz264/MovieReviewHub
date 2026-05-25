package com.moviereviewhub.modules.notification.service.event;

import com.moviereviewhub.modules.reviewsocial.domain.ReviewTargetType;

/**
 * Fired after a reply has been persisted as a nested answer to another reply.
 * The recipient is the parent reply's author, not the root review's author.
 * Listeners run AFTER_COMMIT.
 *
 * @param actorId         user who wrote the answering reply
 * @param parentAuthorId  author of the reply being answered (notification recipient)
 * @param kind            MOVIE or SERIES review (the thread root)
 * @param reviewId        id of the root review (for navigation context)
 * @param parentReplyId   id of the reply being answered
 * @param replyId         id of the newly created reply
 * @param preview         first chars of the new reply body
 */
public record ReplyAnsweredEvent(
        Long actorId,
        Long parentAuthorId,
        ReviewTargetType kind,
        Long reviewId,
        Long parentReplyId,
        Long replyId,
        String preview
) {
}
