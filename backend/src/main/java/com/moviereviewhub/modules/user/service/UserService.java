package com.moviereviewhub.modules.user.service;

import com.moviereviewhub.exception.BadRequestException;
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
import com.moviereviewhub.modules.user.dto.AccountSettingsResponse;
import com.moviereviewhub.modules.user.dto.AccountStatsResponse;
import com.moviereviewhub.modules.user.dto.ChangePasswordRequest;
import com.moviereviewhub.modules.user.dto.CompleteProfileRequest;
import com.moviereviewhub.modules.user.dto.DeleteAccountRequest;
import com.moviereviewhub.modules.user.dto.PublicProfileResponse;
import com.moviereviewhub.modules.user.dto.SetPasswordRequest;
import com.moviereviewhub.modules.user.dto.UpdateAccountSettingsRequest;
import com.moviereviewhub.modules.user.dto.UpdateEmailRequest;
import com.moviereviewhub.modules.user.dto.UpdateProfileRequest;
import com.moviereviewhub.modules.user.dto.UpdateUsernameRequest;
import com.moviereviewhub.modules.user.dto.UserResponse;
import com.moviereviewhub.modules.user.repository.UserRepository;
import com.moviereviewhub.shared.storage.SupabaseStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.ZoneId;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final long MAX_AVATAR_BYTES = 2L * 1024 * 1024;
    private static final Set<String> ALLOWED_AVATAR_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp"
    );
    private static final Set<String> ALLOWED_THEME_COLORS = Set.of(
            "default", "rose", "violet", "indigo", "blue", "teal",
            "green", "amber", "orange", "red", "slate"
    );

    /**
     * Whitelist of hostnames allowed as avatar / cover URL sources. Anything
     * else gets rejected so a malicious user can't point their profile at an
     * attacker-controlled URL (SSRF lateral via frontend prefetch, tracking
     * pixels that log IP/UA on every public profile view).
     *
     * Supabase storage is the canonical upload path. The TMDB and Google CDNs
     * cover OAuth-imported avatars.
     */
    private static final Set<String> ALLOWED_IMAGE_HOST_SUFFIXES = Set.of(
            ".supabase.co",
            ".supabase.in",
            "image.tmdb.org",
            "lh3.googleusercontent.com",
            "lh4.googleusercontent.com",
            "lh5.googleusercontent.com",
            "lh6.googleusercontent.com"
    );

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final ReviewRepository reviewRepository;
    private final SeriesReviewRepository seriesReviewRepository;
    private final FavoriteRepository favoriteRepository;
    private final ListRepository listRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenIssuer tokenIssuer;
    private final SupabaseStorageService supabaseStorage;

    @Transactional(readOnly = true)
    public boolean isUsernameAvailable(String username, Long currentUserId) {
        if (username == null || username.isBlank()) return false;
        String trimmed = username.trim();
        if (ReservedUsernames.isReserved(trimmed)) return false;
        return userRepository.findByUsernameAndDeletedFalse(trimmed)
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
     *  - No expone email/role/provider/timestamps internos ni preferencias.
     *  - Averages en escala 0-5 (rating storage es 1-10, division en query).
     */
    @Transactional(readOnly = true)
    public PublicProfileResponse getPublicProfile(Long userId) {
        User user = userRepository.findById(userId)
                .filter(u -> !u.isDeleted())
                .orElseThrow(() -> new NotFoundException("User not found"));
        return buildPublicProfile(user);
    }

    /** Public profile resolved by canonical handle (username, case-insensitive) or public_id. */
    @Transactional(readOnly = true)
    public PublicProfileResponse getPublicProfileByUsername(String username) {
        User user = userRepository.findByUsernameIgnoreCaseAndDeletedFalse(username)
                .or(() -> userRepository.findByPublicIdAndDeletedFalse(username))
                .orElseThrow(() -> new NotFoundException("User not found"));
        return buildPublicProfile(user);
    }

    private PublicProfileResponse buildPublicProfile(User user) {
        Long userId = user.getId();
        MovieRatingStats movieStats = reviewRepository.getUserRatingStats(userId);
        MovieRatingStats tvStats = seriesReviewRepository.getUserRatingStats(userId);
        long publicLists = listRepository.countByUserIdAndVisibilityAndDeletedFalse(
                userId, ListVisibility.PUBLIC);

        return new PublicProfileResponse(
                user.getId(),
                user.getPublicId(),
                user.getUsername(),
                user.getHandle(),
                user.getAvatarUrl(),
                user.getCoverUrl(),
                user.getBio(),
                user.getThemeColor(),
                new PublicProfileResponse.SocialLinks(
                        user.getSocialFacebook(),
                        user.getSocialInstagram(),
                        user.getSocialTwitter(),
                        user.getSocialTiktok()
                ),
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
            String normalized = emptyToNull(req.avatarUrl());
            requireAllowedImageHost(normalized, "avatarUrl");
            user.setAvatarUrl(normalized);
        }
        if (req.coverUrl() != null) {
            String normalized = emptyToNull(req.coverUrl());
            requireAllowedImageHost(normalized, "coverUrl");
            user.setCoverUrl(normalized);
        }
        if (req.handle() != null) {
            String desired = req.handle().trim();
            if (desired.isEmpty()) {
                user.setHandle(null);
            } else {
                String current = user.getHandle();
                if (current == null || !current.equalsIgnoreCase(desired)) {
                    if (userRepository.existsByHandleIgnoreCaseAndDeletedFalse(desired)) {
                        throw new ConflictException("Handle already in use");
                    }
                }
                user.setHandle(desired);
            }
        }
        if (req.themeColor() != null) {
            String t = req.themeColor().trim();
            if (t.isEmpty()) {
                user.setThemeColor(null);
            } else if (!ALLOWED_THEME_COLORS.contains(t)) {
                throw new BadRequestException("Theme color not allowed");
            } else {
                user.setThemeColor(t);
            }
        }
        if (req.socialFacebook() != null) {
            user.setSocialFacebook(emptyToNull(req.socialFacebook()));
        }
        if (req.socialInstagram() != null) {
            user.setSocialInstagram(emptyToNull(req.socialInstagram()));
        }
        if (req.socialTwitter() != null) {
            user.setSocialTwitter(emptyToNull(req.socialTwitter()));
        }
        if (req.socialTiktok() != null) {
            user.setSocialTiktok(emptyToNull(req.socialTiktok()));
        }
        userRepository.save(user);
        return getPublicProfile(user.getId());
    }

    /**
     * Lee preferencias personales del usuario autenticado.
     */
    @Transactional(readOnly = true)
    public AccountSettingsResponse getSettings(User user) {
        return AccountSettingsResponse.from(user);
    }

    /**
     * Self-update de preferencias. Solo el owner llega aqui.
     */
    @Transactional
    public AccountSettingsResponse updateSettings(User user, UpdateAccountSettingsRequest req) {
        if (req.defaultLanguage() != null) {
            user.setDefaultLanguage(emptyToNull(req.defaultLanguage()));
        }
        if (req.fallbackLanguage() != null) {
            user.setFallbackLanguage(emptyToNull(req.fallbackLanguage()));
        }
        if (req.country() != null) {
            user.setCountry(emptyToNull(req.country()));
        }
        if (req.timezone() != null) {
            String tz = req.timezone().trim();
            if (tz.isEmpty()) {
                user.setTimezone(null);
            } else if (!ZoneId.getAvailableZoneIds().contains(tz)) {
                throw new BadRequestException("Unknown timezone");
            } else {
                user.setTimezone(tz);
            }
        }
        if (req.autodetectTimezone() != null) {
            user.setAutodetectTimezone(req.autodetectTimezone());
        }
        userRepository.save(user);
        return AccountSettingsResponse.from(user);
    }

    /**
     * Sube avatar a Supabase Storage y persiste la URL publica.
     * Validacion: tamano <= 2MB, content-type whitelisted, magic-bytes coinciden.
     */
    @Transactional
    public UserResponse uploadAvatar(User user, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Avatar file is required");
        }
        if (file.getSize() > MAX_AVATAR_BYTES) {
            throw new BadRequestException("Avatar exceeds 2MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_AVATAR_TYPES.contains(contentType)) {
            throw new BadRequestException("Avatar must be jpeg, png or webp");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (Exception e) {
            throw new BadRequestException("Could not read avatar file");
        }

        if (!matchesMagicBytes(bytes, contentType)) {
            throw new BadRequestException("Avatar content does not match declared type");
        }

        String ext = switch (contentType) {
            case "image/jpeg" -> "jpg";
            case "image/png"  -> "png";
            case "image/webp" -> "webp";
            default           -> "bin";
        };
        String filename = UUID.randomUUID() + "." + ext;
        String folder = "users/" + user.getId();
        String publicUrl = supabaseStorage.uploadAvatar(folder, filename, contentType, bytes);

        user.setAvatarUrl(publicUrl);
        userRepository.save(user);
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse removeAvatar(User user) {
        user.setAvatarUrl(null);
        userRepository.save(user);
        return UserResponse.from(user);
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

    private static String emptyToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    /**
     * Rejects URLs whose host is not on {@link #ALLOWED_IMAGE_HOST_SUFFIXES}.
     * null is allowed (caller is clearing the field). Anything else (bare
     * strings, non-https schemes, foreign hosts) is a 400.
     */
    private static void requireAllowedImageHost(String url, String field) {
        if (url == null) return;
        java.net.URI uri;
        try {
            uri = new java.net.URI(url);
        } catch (java.net.URISyntaxException e) {
            throw new BadRequestException(field + " is not a valid URL");
        }
        String scheme = uri.getScheme();
        String host = uri.getHost();
        if (!"https".equalsIgnoreCase(scheme) || host == null) {
            throw new BadRequestException(field + " must be an https URL");
        }
        String lowered = host.toLowerCase();
        for (String suffix : ALLOWED_IMAGE_HOST_SUFFIXES) {
            if (suffix.startsWith(".") ? lowered.endsWith(suffix) : lowered.equals(suffix)) {
                return;
            }
        }
        throw new BadRequestException(field + " host not on the image allow-list");
    }

    private static boolean matchesMagicBytes(byte[] bytes, String contentType) {
        if (bytes.length < 4) return false;
        return switch (contentType) {
            case "image/jpeg" -> (bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8;
            case "image/png"  -> (bytes[0] & 0xFF) == 0x89 && bytes[1] == 'P'
                    && bytes[2] == 'N' && bytes[3] == 'G';
            case "image/webp" -> bytes.length >= 12
                    && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                    && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P';
            default -> false;
        };
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
        verifyPasswordIfLocal(user, req.currentPassword());

        String desired = req.newUsername().trim();
        if (desired.equals(user.getUsername())) {
            return UserResponse.from(user);
        }
        if (ReservedUsernames.isReserved(desired)) {
            throw new ConflictException("Username is reserved");
        }
        if (userRepository.existsByUsernameAndDeletedFalse(desired)) {
            throw new ConflictException("Username already in use");
        }

        user.setUsername(desired);
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public AuthResult updateEmail(User user, UpdateEmailRequest req) {
        verifyPasswordIfLocal(user, req.currentPassword());

        if (!req.newEmail().equalsIgnoreCase(user.getEmail())) {
            if (userRepository.existsByEmailAndDeletedFalse(req.newEmail())) {
                throw new ConflictException("Email already in use");
            }
            user.setEmail(req.newEmail());
            user = userRepository.save(user);
        }

        refreshTokenRepository.revokeAllByUser(user);
        return tokenIssuer.issueTokens(user);
    }

    @Transactional
    public void changePassword(User user, ChangePasswordRequest req) {
        if (!hasLocalPassword(user)) {
            throw new BadRequestException("No local password set. Use set-password endpoint instead.");
        }
        verifyPasswordIfLocal(user, req.currentPassword());

        if (passwordEncoder.matches(req.newPassword(), user.getPassword())) {
            throw new ConflictException("New password must be different from current password");
        }

        user.setPassword(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);

        refreshTokenRepository.revokeAllByUser(user);
    }

    /**
     * Enables local email/password sign-in for an OAuth-only user. Sets a local
     * password without invalidating the OAuth link, so the account becomes
     * "linked" (can sign in with either method). Refuses if a local password
     * already exists — use changePassword for that flow.
     */
    @Transactional
    public void setLocalPassword(User user, SetPasswordRequest req) {
        if (hasLocalPassword(user)) {
            throw new ConflictException("Local password already exists. Use change password instead.");
        }
        user.setPassword(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);
        refreshTokenRepository.revokeAllByUser(user);
    }

    @Transactional
    public void deleteAccount(User user, DeleteAccountRequest req) {
        verifyPasswordIfLocal(user, req.currentPassword());

        user.setDeleted(true);
        user.setEmail("deleted-" + user.getId() + "@deleted.local");
        user.setUsername("deleted-" + user.getId());
        user.setHandle(null);
        user.setProvider(null);
        user.setProviderId(null);
        userRepository.save(user);

        refreshTokenRepository.revokeAllByUser(user);
    }

    private static boolean hasLocalPassword(User user) {
        return user.getPassword() != null && !user.getPassword().isBlank();
    }

    /**
     * For local accounts: require currentPassword and verify it.
     * For OAuth-only accounts (no local password): rely on the authenticated
     * JWT session — currentPassword is ignored/optional.
     */
    private void verifyPasswordIfLocal(User user, String rawPassword) {
        if (!hasLocalPassword(user)) {
            return;
        }
        if (rawPassword == null || rawPassword.isBlank()) {
            throw new BadRequestException("Current password is required");
        }
        if (!passwordEncoder.matches(rawPassword, user.getPassword())) {
            throw new UnauthorizedException("Current password is incorrect");
        }
    }
}
