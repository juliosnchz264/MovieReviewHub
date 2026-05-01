package com.moviereviewhub.modules.auth.service;

import com.moviereviewhub.config.properties.JwtProperties;
import com.moviereviewhub.exception.ConflictException;
import com.moviereviewhub.exception.UnauthorizedException;
import com.moviereviewhub.modules.auth.domain.RefreshToken;
import com.moviereviewhub.modules.auth.dto.AuthResponse;
import com.moviereviewhub.modules.auth.dto.LoginRequest;
import com.moviereviewhub.modules.auth.dto.RegisterRequest;
import com.moviereviewhub.modules.auth.repository.RefreshTokenRepository;
import com.moviereviewhub.modules.user.domain.User;
import com.moviereviewhub.modules.user.domain.UserRole;
import com.moviereviewhub.modules.user.dto.UserResponse;
import com.moviereviewhub.modules.user.repository.UserRepository;
import com.moviereviewhub.security.jwt.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;

    @Transactional
    public UserResponse register(RegisterRequest req) {
        if (userRepository.existsByEmailAndDeletedFalse(req.email())) {
            throw new ConflictException("Email already in use");
        }
        if (userRepository.existsByUsernameAndDeletedFalse(req.username())) {
            throw new ConflictException("Username already in use");
        }

        User user = User.builder()
                .username(req.username())
                .email(req.email())
                .password(passwordEncoder.encode(req.password()))
                .role(UserRole.ROLE_USER)
                .build();

        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public AuthResult login(LoginRequest req) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.email(), req.password())
        );

        User user = userRepository.findByEmailAndDeletedFalse(req.email())
                .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));

        return issueTokens(user);
    }

    @Transactional
    public AuthResult refresh(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new UnauthorizedException("Missing refresh token");
        }

        Claims claims;
        try {
            claims = jwtService.parse(refreshToken);
        } catch (JwtException e) {
            throw new UnauthorizedException("Invalid refresh token");
        }

        if (!jwtService.isRefreshToken(claims)) {
            throw new UnauthorizedException("Invalid token type");
        }

        RefreshToken stored = refreshTokenRepository.findByToken(refreshToken)
                .orElseThrow(() -> new UnauthorizedException("Refresh token not recognized"));

        if (!stored.isUsable()) {
            throw new UnauthorizedException("Refresh token expired or revoked");
        }

        // Rotation: revoke old, issue new pair
        stored.setRevoked(true);
        refreshTokenRepository.save(stored);

        return issueTokens(stored.getUser());
    }

    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        refreshTokenRepository.findByToken(refreshToken).ifPresent(rt -> {
            rt.setRevoked(true);
            refreshTokenRepository.save(rt);
        });
    }

    private AuthResult issueTokens(User user) {
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

    public record AuthResult(AuthResponse body, String refreshToken) {
    }
}
