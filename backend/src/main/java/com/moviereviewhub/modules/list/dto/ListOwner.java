package com.moviereviewhub.modules.list.dto;

import com.moviereviewhub.modules.user.domain.User;

public record ListOwner(Long id, String username) {
    public static ListOwner from(User user) {
        return new ListOwner(user.getId(), user.getUsername());
    }
}
