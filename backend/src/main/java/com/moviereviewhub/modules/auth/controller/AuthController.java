package com.moviereviewhub.modules.auth.controller;

import com.moviereviewhub.config.properties.CookieProperties;
import com.moviereviewhub.config.properties.JwtProperties;
import com.moviereviewhub.modules.auth.dto.AuthResponse;
import com.moviereviewhub.modules.auth.dto.LoginRequest;
import com.moviereviewhub.modules.auth.dto.RegisterRequest;
import com.moviereviewhub.modules.auth.service.AuthService;
import com.moviereviewhub.modules.auth.service.AuthService.AuthResult;
import com.moviereviewhub.modules.user.dto.UserResponse;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtProperties jwtProperties;
    private final CookieProperties cookieProperties;

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.status(201).body(authService.register(req));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        AuthResult result = authService.login(req);
        return tokenResponse(result);
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(name = "${app.cookie.refresh-token-name}", required = false) String refreshToken
    ) {
        AuthResult result = authService.refresh(refreshToken);
        return tokenResponse(result);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = "${app.cookie.refresh-token-name}", required = false) String refreshToken,
            HttpServletRequest request
    ) {
        authService.logout(refreshToken);
        ResponseCookie clear = buildClearCookie();
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, clear.toString())
                .build();
    }

    private ResponseEntity<AuthResponse> tokenResponse(AuthResult result) {
        ResponseCookie cookie = buildRefreshCookie(result.refreshToken());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(result.body());
    }

    private ResponseCookie buildRefreshCookie(String token) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(cookieProperties.refreshTokenName(), token)
                .httpOnly(true)
                .secure(cookieProperties.secure())
                .sameSite(cookieProperties.sameSite())
                .path(cookieProperties.path())
                .maxAge(jwtProperties.refreshExpirationMs() / 1000);
        if (cookieProperties.domain() != null && !cookieProperties.domain().isBlank()) {
            builder.domain(cookieProperties.domain());
        }
        return builder.build();
    }

    private ResponseCookie buildClearCookie() {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(cookieProperties.refreshTokenName(), "")
                .httpOnly(true)
                .secure(cookieProperties.secure())
                .sameSite(cookieProperties.sameSite())
                .path(cookieProperties.path())
                .maxAge(0);
        if (cookieProperties.domain() != null && !cookieProperties.domain().isBlank()) {
            builder.domain(cookieProperties.domain());
        }
        return builder.build();
    }
}
