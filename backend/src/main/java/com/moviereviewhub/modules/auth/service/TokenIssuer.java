package com.moviereviewhub.modules.auth.service;

import com.moviereviewhub.config.properties.JwtProperties;
import com.moviereviewhub.modules.auth.domain.RefreshToken;
import com.moviereviewhub.modules.auth.dto.AuthResponse;
import com.moviereviewhub.modules.auth.repository.RefreshTokenRepository;
import com.moviereviewhub.modules.user.domain.User;
import com.moviereviewhub.modules.user.dto.UserResponse;
import com.moviereviewhub.security.jwt.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Issues access + refresh tokens for an authenticated User. Lives in its own
 * service so AuthService and OAuth2AuthService can both depend on it without
 * referencing each other.
 */
@Service
@RequiredArgsConstructor
public class TokenIssuer {

    private final JwtService jwtService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtProperties jwtProperties;

    public record AuthResult(AuthResponse body, String refreshToken) {
    }

    @Transactional
    public AuthResult issueTokens(User user) {
        String access = jwtService.generateAccessToken(user);
        String refresh = jwtService.generateRefreshToken(user);

        RefreshToken rt = RefreshToken.builder()
                .token(refresh)
                .user(user)
                .expiresAt(Instant.now().plusMillis(jwtProperties.refreshExpirationMs()))
                .revoked(false)
                .build();
        refreshTokenRepository.save(rt);

        AuthResponse body = AuthResponse.of(access, jwtProperties.accessExpirationMs(),
                UserResponse.from(user));
        return new AuthResult(body, refresh);
    }
}
