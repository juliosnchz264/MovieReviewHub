package com.moviereviewhub.modules.admin.dto;

import com.moviereviewhub.modules.user.domain.User;
import com.moviereviewhub.modules.user.domain.UserRole;

import java.time.Instant;

public record AdminUserResponse(
        Long id,
        String username,
        String email,
        UserRole role,
        boolean banned,
        Instant createdAt,
        Instant updatedAt
) {
    public static AdminUserResponse from(User u) {
        return new AdminUserResponse(
                u.getId(),
                u.getUsername(),
                u.getEmail(),
                u.getRole(),
                u.isDeleted(),
                u.getCreatedAt(),
                u.getUpdatedAt()
        );
    }
}
