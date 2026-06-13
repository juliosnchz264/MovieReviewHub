package com.moviereviewhub.modules.auth.service;

import com.moviereviewhub.exception.ConflictException;
import com.moviereviewhub.exception.OAuthOnlyAccountException;
import com.moviereviewhub.exception.UnauthorizedException;
import com.moviereviewhub.modules.auth.domain.RefreshToken;
import com.moviereviewhub.modules.auth.dto.LoginRequest;
import com.moviereviewhub.modules.auth.dto.RegisterRequest;
import com.moviereviewhub.modules.auth.repository.RefreshTokenRepository;
import com.moviereviewhub.modules.list.service.DefaultListInitializer;
import com.moviereviewhub.modules.user.domain.User;
import com.moviereviewhub.modules.user.domain.UserRole;
import com.moviereviewhub.modules.user.repository.UserRepository;
import com.moviereviewhub.security.jwt.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthServiceUnitTest {

    private UserRepository users;
    private RefreshTokenRepository refreshTokens;
    private PasswordEncoder encoder;
    private AuthenticationManager authManager;
    private JwtService jwt;
    private TokenIssuer issuer;
    private DefaultListInitializer defaults;
    private AuthService svc;

    @BeforeEach
    void setUp() {
        users = mock(UserRepository.class);
        refreshTokens = mock(RefreshTokenRepository.class);
        encoder = mock(PasswordEncoder.class);
        authManager = mock(AuthenticationManager.class);
        jwt = mock(JwtService.class);
        issuer = mock(TokenIssuer.class);
        defaults = mock(DefaultListInitializer.class);
        svc = new AuthService(users, refreshTokens, encoder, authManager, jwt, issuer, defaults);
    }

    // ---------- register ----------

    @Test
    void registerRejectsTakenEmail() {
        // Stub the underlying IgnoreCase methods — the legacy aliases are
        // default methods that delegate, so mockito doesn't intercept them.
        when(users.existsByEmailIgnoreCaseAndDeletedFalse("a@b.com")).thenReturn(true);
        assertThatThrownBy(() -> svc.register(new RegisterRequest("user", "a@b.com", "pw")))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Email");
        verify(users, never()).save(any());
    }

    @Test
    void registerRejectsTakenUsername() {
        when(users.existsByEmailIgnoreCaseAndDeletedFalse("a@b.com")).thenReturn(false);
        when(users.existsByUsernameIgnoreCaseAndDeletedFalse("user")).thenReturn(true);
        assertThatThrownBy(() -> svc.register(new RegisterRequest("user", "a@b.com", "pw")))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Username");
    }

    // ---------- login ----------

    @Test
    void loginPropagatesBadCredentialsForUnknownUser() {
        when(authManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("bad"));
        when(users.findByEmailIgnoreCaseAndDeletedFalse("a@b.com")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> svc.login(new LoginRequest("a@b.com", "pw")))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void loginSurfacesOAuthOnlyHintAfterFailedPassword() {
        User u = new User();
        u.setProvider("google");
        u.setPassword(null);
        when(authManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("bad"));
        when(users.findByEmailIgnoreCaseAndDeletedFalse("a@b.com")).thenReturn(Optional.of(u));
        assertThatThrownBy(() -> svc.login(new LoginRequest("a@b.com", "pw")))
                .isInstanceOf(OAuthOnlyAccountException.class);
    }

    @Test
    void loginDoesNotSurfaceOAuthHintBeforeAuthenticate() {
        // Pre-flight enumeration channel closed: success path must not consult
        // findByEmail for OAuth-only detection before authenticate() runs.
        User u = new User();
        u.setId(7L);
        when(users.findByEmailIgnoreCaseAndDeletedFalse("a@b.com")).thenReturn(Optional.of(u));

        svc.login(new LoginRequest("a@b.com", "pw"));

        verify(authManager, times(1)).authenticate(any());
        verify(issuer).issueTokens(u);
    }

    // ---------- refresh ----------

    @Test
    void refreshRejectsBlankToken() {
        assertThatThrownBy(() -> svc.refresh(null))
                .isInstanceOf(UnauthorizedException.class);
        assertThatThrownBy(() -> svc.refresh(""))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void refreshRejectsMalformedJwt() {
        when(jwt.parse("bad")).thenThrow(new JwtException("malformed"));
        assertThatThrownBy(() -> svc.refresh("bad"))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void refreshRejectsAccessToken() {
        Claims c = mock(Claims.class);
        when(jwt.parse("tok")).thenReturn(c);
        when(jwt.isRefreshToken(c)).thenReturn(false);
        assertThatThrownBy(() -> svc.refresh("tok"))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void refreshReplayRevokesEntireFamily() {
        Claims c = mock(Claims.class);
        when(jwt.parse("tok")).thenReturn(c);
        when(jwt.isRefreshToken(c)).thenReturn(true);

        User u = new User();
        u.setId(7L);
        RefreshToken stored = RefreshToken.builder()
                .token("tok")
                .user(u)
                .expiresAt(Instant.now().plusSeconds(1000))
                .revoked(true)
                .build();
        when(refreshTokens.findByToken("tok")).thenReturn(Optional.of(stored));

        assertThatThrownBy(() -> svc.refresh("tok"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("replay");
        verify(refreshTokens).revokeAllByUser(u);
    }

    @Test
    void refreshRejectsExpiredToken() {
        Claims c = mock(Claims.class);
        when(jwt.parse("tok")).thenReturn(c);
        when(jwt.isRefreshToken(c)).thenReturn(true);

        User u = new User();
        u.setId(7L);
        RefreshToken stored = RefreshToken.builder()
                .token("tok")
                .user(u)
                .expiresAt(Instant.now().minusSeconds(10))
                .revoked(false)
                .build();
        when(refreshTokens.findByToken("tok")).thenReturn(Optional.of(stored));

        assertThatThrownBy(() -> svc.refresh("tok"))
                .isInstanceOf(UnauthorizedException.class);
        verify(refreshTokens, never()).revokeAllByUser(any());
    }

    @Test
    void refreshHappyPathRevokesOldAndIssuesNew() {
        Claims c = mock(Claims.class);
        when(jwt.parse("tok")).thenReturn(c);
        when(jwt.isRefreshToken(c)).thenReturn(true);

        User u = new User();
        u.setId(7L);
        RefreshToken stored = RefreshToken.builder()
                .token("tok")
                .user(u)
                .expiresAt(Instant.now().plusSeconds(1000))
                .revoked(false)
                .build();
        when(refreshTokens.findByToken("tok")).thenReturn(Optional.of(stored));

        svc.refresh("tok");

        verify(refreshTokens).save(stored);
        verify(issuer).issueTokens(u);
    }

    // ---------- logout ----------

    @Test
    void logoutOnBlankIsNoop() {
        svc.logout(null);
        svc.logout("");
        verify(refreshTokens, never()).findByToken(any());
    }

    @Test
    void logoutRevokesIfPresent() {
        User u = new User();
        u.setId(7L);
        RefreshToken stored = RefreshToken.builder()
                .token("tok")
                .user(u)
                .expiresAt(Instant.now().plusSeconds(1000))
                .revoked(false)
                .build();
        when(refreshTokens.findByToken("tok")).thenReturn(Optional.of(stored));

        svc.logout("tok");

        verify(refreshTokens).save(stored);
    }

    @Test
    void logoutSilentOnUnknownToken() {
        when(refreshTokens.findByToken("tok")).thenReturn(Optional.empty());
        svc.logout("tok");
        verify(refreshTokens, never()).save(any());
    }
}
