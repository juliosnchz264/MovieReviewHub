package com.moviereviewhub.modules.list.dto;

import com.moviereviewhub.modules.list.domain.ListVisibility;
import jakarta.validation.constraints.Size;

public record ListUpdateRequest(
        @Size(min = 1, max = 80)
        String title,

        @Size(max = 500)
        String description,

        ListVisibility visibility
) {
}
