package com.moviereviewhub.modules.notification.domain;

public enum NotificationType {
    /** Someone liked a review you authored. */
    REVIEW_LIKED,
    /** Someone replied to a review you authored. */
    REVIEW_REPLIED,
    /** Someone answered a reply you authored. */
    REPLY_ANSWERED,
    /** Someone liked a reply you authored. */
    REPLY_LIKED,
    /**
     * Someone posted in a thread (review's reply tree) where you also
     * participated, and you are not the direct recipient of the originating
     * REVIEW_REPLIED / REPLY_ANSWERED event.
     */
    THREAD_ACTIVITY
}
