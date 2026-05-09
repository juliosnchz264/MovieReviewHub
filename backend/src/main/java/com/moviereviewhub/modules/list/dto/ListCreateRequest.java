package com.moviereviewhub.modules.list.dto;

import com.moviereviewhub.modules.list.domain.ListVisibility;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ListCreateRequest(
        @NotBlank
        @Size(min = 1, max = 80)
        String title,

        @Size(max = 500)
        String description,

        @NotNull
        ListVisibility visibility
) {
}
