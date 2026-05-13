package com.moviereviewhub.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Supabase Storage configuration. All values optional: when {@code url} or
 * {@code serviceRoleKey} are blank, uploads are disabled and the avatar
 * endpoint returns 503.
 */
@ConfigurationProperties(prefix = "supabase")
public record SupabaseProperties(
        String url,
        String serviceRoleKey,
        String avatarBucket,
        String publicBaseUrl
) {
    public boolean isConfigured() {
        return url != null && !url.isBlank()
                && serviceRoleKey != null && !serviceRoleKey.isBlank()
                && avatarBucket != null && !avatarBucket.isBlank();
    }

    public String resolvedPublicBaseUrl() {
        if (publicBaseUrl != null && !publicBaseUrl.isBlank()) {
            return publicBaseUrl;
        }
        return url;
    }
}
