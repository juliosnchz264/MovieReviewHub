package com.moviereviewhub.modules.auth.service;

import com.moviereviewhub.config.properties.JwtProperties;
import com.moviereviewhub.exception.ConflictException;
import com.moviereviewhub.modules.auth.dto.RegisterRequest;
import com.moviereviewhub.modules.auth.repository.RefreshTokenRepository;
import com.moviereviewhub.modules.user.domain.User;
import com.moviereviewhub.modules.user.domain.UserRole;
import com.moviereviewhub.modules.user.dto.UserResponse;
import com.moviereviewhub.modules.user.repository.UserRepository;
import com.moviereviewhub.security.jwt.JwtService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock UserRepository userRepository;
    @Mock RefreshTokenRepository refreshTokenRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock AuthenticationManager authenticationManager;
    @Mock JwtService jwtService;
    @Mock JwtProperties jwtProperties;

    @InjectMocks AuthService authService;

    @Test
    void register_savesNewUser_whenEmailAndUsernameAvailable() {
        RegisterRequest req = new RegisterRequest("alice", "alice@test.com", "password123");

        when(userRepository.existsByEmailAndDeletedFalse("alice@test.com")).thenReturn(false);
        when(userRepository.existsByUsernameAndDeletedFalse("alice")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(1L);
            return u;
        });

        UserResponse res = authService.register(req);

        assertThat(res.id()).isEqualTo(1L);
        assertThat(res.username()).isEqualTo("alice");
        assertThat(res.email()).isEqualTo("alice@test.com");
        assertThat(res.role()).isEqualTo(UserRole.ROLE_USER);
        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_throwsConflict_whenEmailTaken() {
        RegisterRequest req = new RegisterRequest("alice", "alice@test.com", "password123");
        when(userRepository.existsByEmailAndDeletedFalse("alice@test.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(req))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Email already in use");

        verify(userRepository, never()).save(any());
    }

    @Test
    void register_throwsConflict_whenUsernameTaken() {
        RegisterRequest req = new RegisterRequest("alice", "alice@test.com", "password123");
        when(userRepository.existsByEmailAndDeletedFalse("alice@test.com")).thenReturn(false);
        when(userRepository.existsByUsernameAndDeletedFalse("alice")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(req))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Username already in use");

        verify(userRepository, never()).save(any());
    }
}
