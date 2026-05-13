package com.moviereviewhub.modules.user.dto;

import com.moviereviewhub.modules.user.domain.User;

/**
 * Preferencias personales del usuario. No expuestas en perfil publico.
 */
public record AccountSettingsResponse(
        String defaultLanguage,
        String fallbackLanguage,
        String country,
        String timezone,
        boolean autodetectTimezone
) {
    public static AccountSettingsResponse from(User user) {
        return new AccountSettingsResponse(
                user.getDefaultLanguage(),
                user.getFallbackLanguage(),
                user.getCountry(),
                user.getTimezone(),
                user.isAutodetectTimezone()
        );
    }
}
