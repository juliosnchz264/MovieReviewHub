package com.moviereviewhub.modules.user.service;

import com.moviereviewhub.exception.ConflictException;
import com.moviereviewhub.exception.NotFoundException;
import com.moviereviewhub.exception.UnauthorizedException;
import com.moviereviewhub.modules.auth.repository.RefreshTokenRepository;
import com.moviereviewhub.modules.auth.service.TokenIssuer;
import com.moviereviewhub.modules.auth.service.TokenIssuer.AuthResult;
import com.moviereviewhub.modules.favorite.repository.FavoriteRepository;
import com.moviereviewhub.modules.list.domain.ListVisibility;
import com.moviereviewhub.modules.list.repository.ListRepository;
import com.moviereviewhub.modules.review.dto.MovieRatingStats;
import com.moviereviewhub.modules.review.repository.ReviewRepository;
import com.moviereviewhub.modules.seriesreview.repository.SeriesReviewRepository;
import com.moviereviewhub.modules.user.domain.User;
import com.moviereviewhub.modules.user.dto.AccountStatsResponse;
import com.moviereviewhub.modules.user.dto.ChangePasswordRequest;
import com.moviereviewhub.modules.user.dto.CompleteProfileRequest;
import com.moviereviewhub.modules.user.dto.DeleteAccountRequest;
import com.moviereviewhub.modules.user.dto.PublicProfileResponse;
import com.moviereviewhub.modules.user.dto.UpdateEmailRequest;
import com.moviereviewhub.modules.user.dto.UpdateProfileRequest;
import com.moviereviewhub.modules.user.dto.UpdateUsernameRequest;
import com.moviereviewhub.modules.user.dto.UserResponse;
import com.moviereviewhub.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final ReviewRepository reviewRepository;
    private final SeriesReviewRepository seriesReviewRepository;
    private final FavoriteRepository favoriteRepository;
    private final ListRepository listRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenIssuer tokenIssuer;

    @Transactional(readOnly = true)
    public boolean isUsernameAvailable(String username, Long currentUserId) {
        return userRepository.findByUsernameAndDeletedFalse(username)
                .map(u -> u.getId().equals(currentUserId))
                .orElse(true);
    }

    @Transactional(readOnly = true)
    public boolean isEmailAvailable(String email, Long currentUserId) {
        return userRepository.findByEmailAndDeletedFalse(email)
                .map(u -> u.getId().equals(currentUserId))
                .orElse(true);
    }

    @Transactional(readOnly = true)
    public AccountStatsResponse getStats(User user) {
        long reviews = reviewRepository.countByUser_IdAndDeletedFalse(user.getId());
        long favorites = favoriteRepository.countByUserId(user.getId());
        return new AccountStatsResponse(reviews, favorites, user.getCreatedAt());
    }

    /**
     * Perfil publico. Endpoint sin auth.
     *  - Soft-deleted -> 404 (no leak existence).
     *  - No expone email/role/provider/timestamps internos.
     *  - Averages en escala 0-5 (rating storage es 1-10, division en query).
     */
    @Transactional(readOnly = true)
    public PublicProfileResponse getPublicProfile(Long userId) {
        User user = userRepository.findById(userId)
                .filter(u -> !u.isDeleted())
                .orElseThrow(() -> new NotFoundException("User not found"));

        MovieRatingStats movieStats = reviewRepository.getUserRatingStats(userId);
        MovieRatingStats tvStats = seriesReviewRepository.getUserRatingStats(userId);
        long publicLists = listRepository.countByUserIdAndVisibilityAndDeletedFalse(
                userId, ListVisibility.PUBLIC);

        return new PublicProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getAvatarUrl(),
                user.getCoverUrl(),
                user.getBio(),
                user.getCreatedAt(),
                movieStats.count() == 0 ? null : round1(movieStats.average()),
                tvStats.count() == 0 ? null : round1(tvStats.average()),
                movieStats.count(),
                tvStats.count(),
                publicLists
        );
    }

    /**
     * Self-update de campos del perfil. Solo el owner llega aqui (filtrado en controller via /me).
     * null = no tocar; "" = limpiar.
     */
    @Transactional
    public PublicProfileResponse updateProfile(User user, UpdateProfileRequest req) {
        if (req.bio() != null) {
            String sanitized = sanitizeBio(req.bio());
            user.setBio(sanitized.isEmpty() ? null : sanitized);
        }
        if (req.avatarUrl() != null) {
            user.setAvatarUrl(req.avatarUrl().isEmpty() ? null : req.avatarUrl());
        }
        if (req.coverUrl() != null) {
            user.setCoverUrl(req.coverUrl().isEmpty() ? null : req.coverUrl());
        }
        userRepository.save(user);
        return getPublicProfile(user.getId());
    }

    /**
     * Defensa en profundidad: aunque el frontend renderice como texto, removemos
     * caracteres de control y cualquier tag para que un cliente que use el bio
     * en un contexto distinto (RSS, OG meta) no inyecte HTML.
     */
    private static String sanitizeBio(String raw) {
        String stripped = raw.replaceAll("[\\p{Cntrl}&&[^\r\n\t]]", "");
        stripped = stripped.replaceAll("<[^>]*>", "");
        return stripped.trim();
    }

    private static Double round1(Double d) {
        if (d == null) return null;
        return Math.round(d * 10.0) / 10.0;
    }

    @Transactional
    public UserResponse completeProfile(User user, CompleteProfileRequest req) {
        if (user.isProfileCompleted()) {
            throw new ConflictException("Profile already completed");
        }

        String desired = req.username().trim();

        if (ReservedUsernames.isReserved(desired)) {
            throw new ConflictException("Username is reserved");
        }

        if (!desired.equals(user.getUsername())
                && userRepository.existsByUsernameAndDeletedFalse(desired)) {
            throw new ConflictException("Username already in use");
        }

        user.setUsername(desired);
        user.setProfileCompleted(true);
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public UserResponse updateUsername(User user, UpdateUsernameRequest req) {
        verifyPassword(user, req.currentPassword());

        if (req.newUsername().equals(user.getUsername())) {
            return UserResponse.from(user);
        }
        if (userRepository.existsByUsernameAndDeletedFalse(req.newUsername())) {
            throw new ConflictException("Username already in use");
        }

        user.setUsername(req.newUsername());
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public AuthResult updateEmail(User user, UpdateEmailRequest req) {
        verifyPassword(user, req.currentPassword());

        if (!req.newEmail().equalsIgnoreCase(user.getEmail())) {
            if (userRepository.existsByEmailAndDeletedFalse(req.newEmail())) {
                throw new ConflictException("Email already in use");
            }
            user.setEmail(req.newEmail());
            user = userRepository.save(user);
        }

        // Cambio de email = potencial sesion comprometida. Revocar tokens existentes
        // y emitir un par nuevo para mantener la sesion actual.
        refreshTokenRepository.revokeAllByUser(user);
        return tokenIssuer.issueTokens(user);
    }

    @Transactional
    public void changePassword(User user, ChangePasswordRequest req) {
        verifyPassword(user, req.currentPassword());

        if (passwordEncoder.matches(req.newPassword(), user.getPassword())) {
            throw new ConflictException("New password must be different from current password");
        }

        user.setPassword(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);

        // Invalidar todas las sesiones activas tras cambio de password.
        refreshTokenRepository.revokeAllByUser(user);
    }

    @Transactional
    public void deleteAccount(User user, DeleteAccountRequest req) {
        verifyPassword(user, req.currentPassword());

        // Soft delete: marcar deleted, anonimizar email/username para liberar para reuso.
        user.setDeleted(true);
        user.setEmail("deleted-" + user.getId() + "@deleted.local");
        user.setUsername("deleted-" + user.getId());
        userRepository.save(user);

        refreshTokenRepository.revokeAllByUser(user);
    }

    private void verifyPassword(User user, String rawPassword) {
        if (!passwordEncoder.matches(rawPassword, user.getPassword())) {
            throw new UnauthorizedException("Current password is incorrect");
        }
    }
}
