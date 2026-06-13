package com.moviereviewhub.modules.auth.controller;

import com.moviereviewhub.modules.auth.dto.AuthResponse;
import com.moviereviewhub.modules.auth.dto.LoginRequest;
import com.moviereviewhub.modules.auth.dto.RegisterRequest;
import com.moviereviewhub.modules.auth.service.AuthService;
import com.moviereviewhub.modules.auth.service.TokenIssuer.AuthResult;
import com.moviereviewhub.modules.user.dto.UserResponse;
import com.moviereviewhub.security.AuthCookieFactory;
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
    private final AuthCookieFactory authCookieFactory;

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
        ResponseCookie clear = authCookieFactory.clearCookie();
        ResponseCookie clearHint = authCookieFactory.clearHintCookie();
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, clear.toString())
                .header(HttpHeaders.SET_COOKIE, clearHint.toString())
                .build();
    }

    private ResponseEntity<AuthResponse> tokenResponse(AuthResult result) {
        ResponseCookie cookie = authCookieFactory.refreshCookie(result.refreshToken());
        ResponseCookie hint = authCookieFactory.hintCookie();
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .header(HttpHeaders.SET_COOKIE, hint.toString())
                .body(result.body());
    }
}
