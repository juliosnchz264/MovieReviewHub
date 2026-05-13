package com.moviereviewhub.modules.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminPasswordResetRequest(
        @NotBlank
        @Size(min = 8, max = 100)
        String newPassword
) {
}
