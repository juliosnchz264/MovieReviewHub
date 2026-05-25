package com.moviereviewhub.modules.notification.dto;

/**
 * Minimal public-safe slice of a user for notification rendering.
 * Mirrors the fields already exposed by other public endpoints, so we do
 * not leak anything new here.
 */
public record NotificationActorSnippet(
        Long id,
        String username,
        String avatarUrl
) {
}
