package com.moviereviewhub.modules.auth.service;

import com.moviereviewhub.modules.auth.service.TokenIssuer.AuthResult;
import com.moviereviewhub.modules.user.domain.User;
import com.moviereviewhub.modules.user.domain.UserRole;
import com.moviereviewhub.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OAuth2AuthService {

    private static final int MAX_USERNAME_LENGTH = 50;
    private static final int MIN_USERNAME_LENGTH = 3;

    private final UserRepository userRepository;
    private final TokenIssuer tokenIssuer;

    public record OAuth2UserInfo(
            String provider,
            String providerId,
            String email,
            boolean emailVerified,
            String name,
            String picture
    ) {
        public static OAuth2UserInfo fromAttributes(String registrationId, Map<String, Object> attrs) {
            Object sub = attrs.get("sub");
            if (sub == null) {
                throw new IllegalArgumentException("OAuth2 provider returned no 'sub' claim");
            }
            Object verified = attrs.get("email_verified");
            boolean isVerified = !(verified instanceof Boolean b) || b;
            return new OAuth2UserInfo(
                    registrationId.toUpperCase(Locale.ROOT),
                    sub.toString(),
                    (String) attrs.get("email"),
                    isVerified,
                    (String) attrs.getOrDefault("name", ""),
                    (String) attrs.get("picture")
            );
        }
    }

    @Transactional
    public AuthResult processOAuth2User(OAuth2UserInfo info) {
        if (info.email() == null || info.email().isBlank()) {
            throw new IllegalArgumentException("OAuth2 provider returned no email");
        }
        if (!info.emailVerified()) {
            throw new IllegalStateException("Email is not verified by the OAuth2 provider");
        }

        User user = userRepository
                .findByProviderAndProviderIdAndDeletedFalse(info.provider(), info.providerId())
                .orElseGet(() -> linkOrCreate(info));

        return tokenIssuer.issueTokens(user);
    }

    private User linkOrCreate(OAuth2UserInfo info) {
        return userRepository.findByEmailAndDeletedFalse(info.email())
                .map(existing -> {
                    if (existing.getProvider() == null) {
                        existing.setProvider(info.provider());
                        existing.setProviderId(info.providerId());
                    }
                    if (existing.getAvatarUrl() == null && info.picture() != null) {
                        existing.setAvatarUrl(info.picture());
                    }
                    return userRepository.save(existing);
                })
                .orElseGet(() -> createUser(info));
    }

    private User createUser(OAuth2UserInfo info) {
        User user = User.builder()
                .username(generateUniqueUsername(info))
                .email(info.email())
                .password(null)
                .role(UserRole.ROLE_USER)
                .provider(info.provider())
                .providerId(info.providerId())
                .avatarUrl(info.picture())
                .profileCompleted(false)
                .build();
        return userRepository.save(user);
    }

    private String generateUniqueUsername(OAuth2UserInfo info) {
        String base = sanitize(info.email().split("@", 2)[0]);
        if (base.length() < MIN_USERNAME_LENGTH) {
            base = sanitize(info.name());
        }
        if (base.length() < MIN_USERNAME_LENGTH) {
            base = "user";
        }
        if (base.length() > MAX_USERNAME_LENGTH - 5) {
            base = base.substring(0, MAX_USERNAME_LENGTH - 5);
        }

        String candidate = base;
        int suffix = 1;
        while (userRepository.existsByUsernameAndDeletedFalse(candidate)) {
            if (suffix > 50) {
                candidate = base + "-" + UUID.randomUUID().toString().substring(0, 8);
                break;
            }
            candidate = base + "-" + suffix++;
        }
        return candidate;
    }

    private String sanitize(String raw) {
        if (raw == null) return "";
        return raw.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9._-]", "");
    }
}
