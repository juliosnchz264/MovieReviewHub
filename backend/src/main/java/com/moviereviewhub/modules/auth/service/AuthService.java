package com.moviereviewhub.modules.auth.service;

import com.moviereviewhub.exception.ConflictException;
import com.moviereviewhub.exception.OAuthOnlyAccountException;
import com.moviereviewhub.exception.UnauthorizedException;
import com.moviereviewhub.modules.auth.domain.RefreshToken;
import com.moviereviewhub.modules.auth.dto.LoginRequest;
import com.moviereviewhub.modules.auth.dto.RegisterRequest;
import com.moviereviewhub.modules.auth.repository.RefreshTokenRepository;
import com.moviereviewhub.modules.auth.service.TokenIssuer.AuthResult;
import com.moviereviewhub.modules.list.service.DefaultListInitializer;
import com.moviereviewhub.modules.user.domain.User;
import com.moviereviewhub.modules.user.domain.UserRole;
import com.moviereviewhub.modules.user.dto.UserResponse;
import com.moviereviewhub.modules.user.repository.UserRepository;
import com.moviereviewhub.security.jwt.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final TokenIssuer tokenIssuer;
    private final DefaultListInitializer defaultListInitializer;
    private final com.moviereviewhub.common.slug.PublicIdentifierFactory publicIdentifierFactory;

    @Transactional
    public UserResponse register(RegisterRequest req) {
        if (userRepository.existsByEmailIgnoreCaseAndDeletedFalse(req.email())) {
            throw new ConflictException("Email already in use");
        }
        if (userRepository.existsByUsernameIgnoreCaseAndDeletedFalse(req.username())) {
            throw new ConflictException("Username already in use");
        }

        User user = User.builder()
                .username(req.username())
                .email(req.email())
                .password(passwordEncoder.encode(req.password()))
                .role(UserRole.ROLE_USER)
                .publicId(publicIdentifierFactory.uniquePublicId(userRepository::existsByPublicId))
                .build();

        User saved = userRepository.save(user);
        defaultListInitializer.initializeForUser(saved.getId());
        return UserResponse.from(saved);
    }

    @Transactional
    public AuthResult login(LoginRequest req) {
        // Authenticate first so we don't leak account-state information
        // (e.g., "this email is an OAuth-only account") to anyone who can
        // throw arbitrary emails at /login. The OAuth-only hint is only
        // surfaced AFTER a failed password attempt — at that point the
        // requester has already spent a Bucket4j slot, so enumeration is
        // significantly more expensive than the previous pre-flight check.
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.email(), req.password())
            );
        } catch (org.springframework.security.authentication.BadCredentialsException ex) {
            userRepository.findByEmailIgnoreCaseAndDeletedFalse(req.email()).ifPresent(existing -> {
                if (existing.getPassword() == null && existing.getProvider() != null) {
                    throw new OAuthOnlyAccountException(existing.getProvider());
                }
            });
            throw ex;
        }

        User user = userRepository.findByEmailIgnoreCaseAndDeletedFalse(req.email())
                .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));

        return tokenIssuer.issueTokens(user);
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

        // Replay detection: a syntactically valid token we know was already
        // rotated out is being presented again. The legitimate owner has
        // already moved on to a new token. Treat this as theft and revoke
        // the entire family so the active attacker (or compromised client)
        // is logged out everywhere on the next request.
        if (stored.isRevoked()) {
            log.warn("Refresh-token replay detected for user {} — revoking family",
                    stored.getUser().getId());
            refreshTokenRepository.revokeAllByUser(stored.getUser());
            throw new UnauthorizedException("Refresh token replay detected");
        }

        if (!stored.isUsable()) {
            throw new UnauthorizedException("Refresh token expired or revoked");
        }

        // Rotation: revoke old, issue new pair
        stored.setRevoked(true);
        refreshTokenRepository.save(stored);

        return tokenIssuer.issueTokens(stored.getUser());
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
}
