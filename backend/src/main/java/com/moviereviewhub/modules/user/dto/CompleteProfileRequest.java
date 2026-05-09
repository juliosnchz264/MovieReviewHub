package com.moviereviewhub.modules.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CompleteProfileRequest(

        @NotBlank
        @Size(min = 3, max = 50)
        @Pattern(
                regexp = "^[A-Za-z0-9_.-]+$",
                message = "Username may only contain letters, numbers, dot, dash and underscore"
        )
        String username
) {
}
