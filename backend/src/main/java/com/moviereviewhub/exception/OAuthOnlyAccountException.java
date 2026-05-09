package com.moviereviewhub.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Raised when a user tries to log in via password against an account that
 * was created through an OAuth2 provider and has no local password set.
 * The frontend should show a "continue with {provider}" hint instead of a
 * generic "invalid credentials" message.
 */
@Getter
public class OAuthOnlyAccountException extends ApiException {

    public static final String CODE = "USE_OAUTH_PROVIDER";

    private final String provider;

    public OAuthOnlyAccountException(String provider) {
        super(HttpStatus.CONFLICT, "This account uses " + provider + " sign-in. Continue with " + provider + ".");
        this.provider = provider;
    }
}
