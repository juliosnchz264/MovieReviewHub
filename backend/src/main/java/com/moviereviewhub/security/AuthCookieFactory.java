package com.moviereviewhub.security;

import com.moviereviewhub.config.properties.CookieProperties;
import com.moviereviewhub.config.properties.JwtProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AuthCookieFactory {

    /**
     * Non-HttpOnly companion cookie. Carries no secret — just a presence flag
     * the frontend reads before paint so the navbar can render an
     * "authenticated shell" instead of flashing the logged-out CTAs while
     * /auth/refresh resolves.
     */
    private static final String HINT_COOKIE_NAME = "auth_hint";

    private final CookieProperties cookieProperties;
    private final JwtProperties jwtProperties;

    public ResponseCookie refreshCookie(String token) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(cookieProperties.refreshTokenName(), token)
                .httpOnly(true)
                .secure(cookieProperties.secure())
                .sameSite(cookieProperties.sameSite())
                .path(cookieProperties.path())
                .maxAge(jwtProperties.refreshExpirationMs() / 1000);
        applyDomain(builder);
        return builder.build();
    }

    public ResponseCookie clearCookie() {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(cookieProperties.refreshTokenName(), "")
                .httpOnly(true)
                .secure(cookieProperties.secure())
                .sameSite(cookieProperties.sameSite())
                .path(cookieProperties.path())
                .maxAge(0);
        applyDomain(builder);
        return builder.build();
    }

    public ResponseCookie hintCookie() {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(HINT_COOKIE_NAME, "1")
                .httpOnly(false)
                .secure(cookieProperties.secure())
                .sameSite(cookieProperties.sameSite())
                .path(cookieProperties.path())
                .maxAge(jwtProperties.refreshExpirationMs() / 1000);
        applyDomain(builder);
        return builder.build();
    }

    public ResponseCookie clearHintCookie() {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(HINT_COOKIE_NAME, "")
                .httpOnly(false)
                .secure(cookieProperties.secure())
                .sameSite(cookieProperties.sameSite())
                .path(cookieProperties.path())
                .maxAge(0);
        applyDomain(builder);
        return builder.build();
    }

    private void applyDomain(ResponseCookie.ResponseCookieBuilder builder) {
        String domain = cookieProperties.domain();
        if (domain != null && !domain.isBlank()) {
            builder.domain(domain);
        }
    }
}
