package com.moviereviewhub.modules.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateEmailRequest(

        @NotBlank
        @Email
        @Size(max = 255)
        String newEmail,

        /**
         * Required for local accounts. Ignored for OAuth-only accounts (no local
         * password): the JWT session authenticates the change. Note: provider
         * may re-verify the address on next sign-in.
         */
        String currentPassword
) {
}
