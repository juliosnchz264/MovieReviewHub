package com.moviereviewhub.modules.user.dto;

import com.moviereviewhub.modules.user.domain.User;
import com.moviereviewhub.modules.user.domain.UserRole;

public record UserResponse(
        Long id,
        String username,
        String email,
        UserRole role,
        boolean profileCompleted
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole(),
                user.isProfileCompleted()
        );
    }
}
