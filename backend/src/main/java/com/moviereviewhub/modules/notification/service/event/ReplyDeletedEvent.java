package com.moviereviewhub.modules.notification.service.event;

/**
 * Fired AFTER_COMMIT when a reply is soft-deleted. Listeners purge any
 * notifications targeting this reply so the bell never points at a tombstone.
 */
public record ReplyDeletedEvent(
        Long replyId
) {
}
