package com.moviereviewhub.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.cookie")
public record CookieProperties(
        String refreshTokenName,
        boolean secure,
        String sameSite,
        String path,
        String domain
) {
}
