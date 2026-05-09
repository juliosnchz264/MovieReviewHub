package com.moviereviewhub.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "app.oauth2")
public record OAuth2Properties(
        String successRedirect,
        String failureRedirect,
        List<String> allowedRedirectOrigins
) {
}
