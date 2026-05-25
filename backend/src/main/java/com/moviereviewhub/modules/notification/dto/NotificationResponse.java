package com.moviereviewhub.modules.notification.dto;

import com.moviereviewhub.modules.notification.domain.NotificationType;

import java.time.Instant;

public record NotificationResponse(
        Long id,
        NotificationType type,
        NotificationActorSnippet actor,
        int groupCount,
        NotificationTargetSnippet target,
        boolean read,
        boolean seen,
        Instant createdAt,
        Instant updatedAt
) {
}
