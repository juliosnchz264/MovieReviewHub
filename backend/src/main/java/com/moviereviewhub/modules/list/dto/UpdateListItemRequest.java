package com.moviereviewhub.modules.list.dto;

import jakarta.validation.constraints.Size;

public record UpdateListItemRequest(
        @Size(max = 280)
        String note,

        Integer position
) {
}
