package com.moviereviewhub.modules.list.dto;

import com.moviereviewhub.modules.list.domain.ListItemKind;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record AddListItemRequest(
        @NotNull
        ListItemKind kind,

        @NotNull
        @Positive
        Long targetId,

        @Size(max = 280)
        String note
) {
}
