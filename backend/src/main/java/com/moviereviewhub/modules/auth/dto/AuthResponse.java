package com.moviereviewhub.modules.auth.dto;

import com.moviereviewhub.modules.user.dto.UserResponse;

public record AuthResponse(
        String accessToken,
        String tokenType,
        long expiresInMs,
        UserResponse user
) {
    public static AuthResponse of(String accessToken, long expiresInMs, UserResponse user) {
        return new AuthResponse(accessToken, "Bearer", expiresInMs, user);
    }
}
