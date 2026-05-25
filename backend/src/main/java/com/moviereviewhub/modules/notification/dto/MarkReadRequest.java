package com.moviereviewhub.modules.notification.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record MarkReadRequest(
        @NotNull
        @NotEmpty
        @Size(max = 200)
        List<Long> ids
) {
}
