package com.moviereviewhub.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.tmdb")
public record TmdbProperties(
        String apiKey,
        String baseUrl,
        String imageBaseUrl,
        String posterSize
) {
}
