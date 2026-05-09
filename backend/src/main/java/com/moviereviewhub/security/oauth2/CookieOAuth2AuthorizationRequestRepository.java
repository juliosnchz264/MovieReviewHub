package com.moviereviewhub.security.oauth2;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.util.Base64;
import java.util.Optional;

/**
 * Stateless OAuth2 authorization request repository. Stores the request
 * as a Base64URL-encoded, HttpOnly cookie that lives for the duration of
 * the redirect to the provider and back. Lets us keep
 * SessionCreationPolicy.STATELESS.
 */
public class CookieOAuth2AuthorizationRequestRepository
        implements AuthorizationRequestRepository<OAuth2AuthorizationRequest> {

    public static final String COOKIE_NAME = "oauth2_auth_request";
    private static final int MAX_AGE_SECONDS = 180;

    private final boolean secure;
    private final String sameSite;

    public CookieOAuth2AuthorizationRequestRepository(boolean secure, String sameSite) {
        this.secure = secure;
        this.sameSite = sameSite;
    }

    @Override
    public OAuth2AuthorizationRequest loadAuthorizationRequest(HttpServletRequest request) {
        return readCookie(request).flatMap(this::deserialize).orElse(null);
    }

    @Override
    public void saveAuthorizationRequest(
            OAuth2AuthorizationRequest authorizationRequest,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        if (authorizationRequest == null) {
            clearCookie(response);
            return;
        }
        String encoded = serialize(authorizationRequest);
        ResponseCookie cookie = ResponseCookie.from(COOKIE_NAME, encoded)
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path("/")
                .maxAge(MAX_AGE_SECONDS)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    @Override
    public OAuth2AuthorizationRequest removeAuthorizationRequest(
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        OAuth2AuthorizationRequest authorizationRequest = loadAuthorizationRequest(request);
        if (response != null) {
            clearCookie(response);
        }
        return authorizationRequest;
    }

    private Optional<String> readCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return Optional.empty();
        for (Cookie c : cookies) {
            if (COOKIE_NAME.equals(c.getName()) && c.getValue() != null && !c.getValue().isEmpty()) {
                return Optional.of(c.getValue());
            }
        }
        return Optional.empty();
    }

    private void clearCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(COOKIE_NAME, "")
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path("/")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private String serialize(OAuth2AuthorizationRequest request) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             ObjectOutputStream oos = new ObjectOutputStream(baos)) {
            oos.writeObject(request);
            oos.flush();
            return Base64.getUrlEncoder().withoutPadding().encodeToString(baos.toByteArray());
        } catch (IOException e) {
            throw new IllegalStateException("Failed to serialize OAuth2AuthorizationRequest", e);
        }
    }

    private Optional<OAuth2AuthorizationRequest> deserialize(String value) {
        try {
            byte[] bytes = Base64.getUrlDecoder().decode(value);
            try (ByteArrayInputStream bais = new ByteArrayInputStream(bytes);
                 ObjectInputStream ois = new ObjectInputStream(bais)) {
                Object obj = ois.readObject();
                return obj instanceof OAuth2AuthorizationRequest req ? Optional.of(req) : Optional.empty();
            }
        } catch (IOException | ClassNotFoundException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
