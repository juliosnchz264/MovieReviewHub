package com.moviereviewhub.modules.user.dto;

public record DeleteAccountRequest(

        /**
         * Required for local accounts. Ignored for OAuth-only accounts (no local
         * password): the JWT session authenticates the deletion alongside the
         * confirmation token typed in the UI.
         */
        String currentPassword
) {
}
