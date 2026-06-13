package com.moviereviewhub.modules.admin.service;

import com.moviereviewhub.common.dto.PagedResponse;
import com.moviereviewhub.exception.ConflictException;
import com.moviereviewhub.exception.NotFoundException;
import com.moviereviewhub.modules.admin.dto.AdminStats;
import com.moviereviewhub.modules.admin.dto.AdminUserResponse;
import com.moviereviewhub.config.properties.JwtProperties;
import com.moviereviewhub.modules.auth.dto.AuthResponse;
import com.moviereviewhub.modules.auth.repository.RefreshTokenRepository;
import com.moviereviewhub.modules.auth.service.TokenIssuer;
import com.moviereviewhub.modules.user.dto.UserResponse;
import com.moviereviewhub.security.jwt.JwtService;
import com.moviereviewhub.modules.favorite.repository.FavoriteRepository;
import com.moviereviewhub.modules.movie.repository.MovieRepository;
import com.moviereviewhub.modules.review.repository.ReviewRepository;
import com.moviereviewhub.modules.series.repository.SeriesRepository;
import com.moviereviewhub.modules.seriesfavorite.repository.SeriesFavoriteRepository;
import com.moviereviewhub.modules.seriesreview.repository.SeriesReviewRepository;
import com.moviereviewhub.modules.user.domain.User;
import com.moviereviewhub.modules.user.domain.UserRole;
import com.moviereviewhub.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    /** Impersonation tokens live 5 minutes. Admin must re-impersonate after. */
    private static final long IMPERSONATION_TTL_MS = 5 * 60 * 1000L;

    private final UserRepository userRepository;
    private final MovieRepository movieRepository;
    private final ReviewRepository reviewRepository;
    private final FavoriteRepository favoriteRepository;
    private final SeriesRepository seriesRepository;
    private final SeriesReviewRepository seriesReviewRepository;
    private final SeriesFavoriteRepository seriesFavoriteRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenRepository refreshTokenRepository;
    private final TokenIssuer tokenIssuer;
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;

    @Transactional(readOnly = true)
    public PagedResponse<AdminUserResponse> listUsers(String search, Pageable pageable) {
        String s = (search == null) ? "" : search;
        Page<User> page = userRepository.searchAll(s, pageable);
        return PagedResponse.from(page, AdminUserResponse::from);
    }

    @Transactional
    public AdminUserResponse banUser(Long currentAdminId, Long targetUserId) {
        if (currentAdminId.equals(targetUserId)) {
            throw new ConflictException("You cannot ban yourself");
        }
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        user.setDeleted(true);
        return AdminUserResponse.from(userRepository.save(user));
    }

    @Transactional
    public AdminUserResponse unbanUser(Long targetUserId) {
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        // Cuenta auto-eliminada (no baneada): el email y username están anonimizados
        // y normalmente otro registro activo ocupa el provider/email original.
        if (user.getEmail() != null && user.getEmail().endsWith("@deleted.local")) {
            throw new ConflictException(
                    "This account was deleted by the user and cannot be restored"
            );
        }

        // Si el usuario tenía OAuth vinculado, otra cuenta activa puede haberse
        // creado con el mismo (provider, provider_id) tras el ban -> colisión de índice.
        if (user.getProvider() != null && user.getProviderId() != null) {
            userRepository.findByProviderAndProviderIdAndDeletedFalse(
                    user.getProvider(), user.getProviderId()
            ).ifPresent(other -> {
                if (!other.getId().equals(user.getId())) {
                    throw new ConflictException(
                            "Another active account is linked to this user's OAuth provider"
                    );
                }
            });
        }

        user.setDeleted(false);
        return AdminUserResponse.from(userRepository.save(user));
    }

    /**
     * Admin-driven password reset. Encodes a new password for the target user
     * and revokes all outstanding refresh tokens so any existing session is
     * invalidated. Refuses self-targeting and banned accounts.
     */
    @Transactional
    public void resetPassword(Long currentAdminId, Long targetUserId, String newPassword) {
        if (currentAdminId.equals(targetUserId)) {
            throw new ConflictException("Use change-password endpoint for your own account");
        }
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        if (user.isDeleted()) {
            throw new ConflictException("User is banned or deleted");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        refreshTokenRepository.revokeAllByUser(user);
    }

    /**
     * Mints a short-lived (5 min) access token for the target user without
     * going through /auth/login. NO refresh token is issued: the impersonation
     * window is bounded and cannot be silently extended, and the legitimate
     * user's own refresh family stays untouched.
     *
     * Every call is audited (admin id, target id, structured log event) so the
     * action can be reconstructed from logs in case of dispute.
     */
    @Transactional
    public AuthResponse impersonate(Long currentAdminId, Long targetUserId) {
        if (currentAdminId.equals(targetUserId)) {
            throw new ConflictException("Cannot impersonate yourself");
        }
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        if (user.isDeleted()) {
            throw new ConflictException("User is banned or deleted");
        }
        log.warn("AUDIT event=admin_impersonate admin_id={} target_id={} ttl_ms={}",
                currentAdminId, targetUserId, IMPERSONATION_TTL_MS);
        String access = jwtService.generateAccessToken(user, IMPERSONATION_TTL_MS);
        return AuthResponse.of(access, IMPERSONATION_TTL_MS, UserResponse.from(user));
    }

    @Transactional(readOnly = true)
    public AdminStats stats() {
        return new AdminStats(
                userRepository.count(),
                userRepository.countByDeletedFalse(),
                userRepository.countByDeletedTrue(),
                userRepository.countByRole(UserRole.ROLE_ADMIN),
                movieRepository.countByDeletedFalse(),
                seriesRepository.countByDeletedFalse(),
                reviewRepository.countByDeletedFalse(),
                seriesReviewRepository.countByDeletedFalse(),
                favoriteRepository.count(),
                seriesFavoriteRepository.count()
        );
    }
}
