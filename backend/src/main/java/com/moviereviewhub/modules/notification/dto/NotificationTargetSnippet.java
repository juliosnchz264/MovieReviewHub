package com.moviereviewhub.modules.notification.dto;

import com.moviereviewhub.modules.notification.domain.NotificationTargetType;

/**
 * Render-ready summary of whatever the notification points at.
 *
 * <ul>
 *   <li>For REVIEW_LIKED: kind = REVIEW_MOVIE|REVIEW_SERIES, id = review id,
 *       title/posterUrl come from the movie/series, preview is null.</li>
 *   <li>For REVIEW_REPLIED: kind = REPLY, id = reply id, parent* fields
 *       point at the parent review, title/posterUrl come from movie/series,
 *       preview is the trimmed reply body (or null if the reply was deleted).</li>
 * </ul>
 *
 * Any field can be null when the underlying target has been removed; the
 * frontend renders a tombstone in that case rather than navigating.
 */
public record NotificationTargetSnippet(
        NotificationTargetType kind,
        Long id,
        NotificationTargetType parentKind,
        Long parentReviewId,
        String title,
        String posterUrl,
        String preview
) {
}
