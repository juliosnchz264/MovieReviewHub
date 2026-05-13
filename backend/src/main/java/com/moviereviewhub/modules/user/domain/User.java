package com.moviereviewhub.modules.user.domain;

import com.moviereviewhub.common.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(length = 255)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role;

    @Column(length = 20)
    private String provider;

    @Column(name = "provider_id", length = 255)
    private String providerId;

    @Column(name = "avatar_url", columnDefinition = "TEXT")
    private String avatarUrl;

    @Column(name = "cover_url", columnDefinition = "TEXT")
    private String coverUrl;

    @Column(length = 500)
    private String bio;

    @lombok.Builder.Default
    @Column(name = "profile_completed", nullable = false)
    private boolean profileCompleted = true;

    @Column(length = 50)
    private String handle;

    @Column(name = "theme_color", length = 20)
    private String themeColor;

    @Column(name = "social_facebook", length = 255)
    private String socialFacebook;

    @Column(name = "social_instagram", length = 255)
    private String socialInstagram;

    @Column(name = "social_twitter", length = 255)
    private String socialTwitter;

    @Column(name = "social_tiktok", length = 255)
    private String socialTiktok;

    @Column(name = "default_language", length = 10)
    private String defaultLanguage;

    @Column(name = "fallback_language", length = 10)
    private String fallbackLanguage;

    @Column(length = 2)
    private String country;

    @Column(length = 64)
    private String timezone;

    @lombok.Builder.Default
    @Column(name = "autodetect_timezone", nullable = false)
    private boolean autodetectTimezone = true;
}
