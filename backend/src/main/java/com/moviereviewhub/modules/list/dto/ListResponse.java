package com.moviereviewhub.modules.list.dto;

import com.moviereviewhub.modules.list.domain.CustomList;
import com.moviereviewhub.modules.list.domain.DefaultListKind;
import com.moviereviewhub.modules.list.domain.ListVisibility;
import com.moviereviewhub.modules.user.domain.User;

import java.time.Instant;

public record ListResponse(
        Long id,
        String slug,
        String title,
        String description,
        ListVisibility visibility,
        boolean isDefault,
        DefaultListKind defaultKind,
        int itemCount,
        ListOwner owner,
        Instant createdAt,
        Instant updatedAt
) {
    public static ListResponse from(CustomList list, User owner) {
        return new ListResponse(
                list.getId(),
                list.getSlug(),
                list.getTitle(),
                list.getDescription(),
                list.getVisibility(),
                list.isDefault(),
                list.getDefaultKind(),
                list.getItemCount(),
                ListOwner.from(owner),
                list.getCreatedAt(),
                list.getUpdatedAt()
        );
    }
}
