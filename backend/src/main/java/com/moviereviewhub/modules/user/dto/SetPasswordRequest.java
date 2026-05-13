package com.moviereviewhub.modules.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Used by OAuth-only accounts to enable local email/password sign-in.
 * No currentPassword required: authenticated via JWT, and by definition the
 * user has no existing local password. Service refuses if a local password
 * already exists.
 */
public record SetPasswordRequest(

        @NotBlank
        @Size(min = 8, max = 100)
        String newPassword
) {
}
