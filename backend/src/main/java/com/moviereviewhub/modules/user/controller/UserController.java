package com.moviereviewhub.modules.user.controller;

import com.moviereviewhub.config.properties.CookieProperties;
import com.moviereviewhub.config.properties.JwtProperties;
import com.moviereviewhub.exception.UnauthorizedException;
import com.moviereviewhub.modules.auth.dto.AuthResponse;
import com.moviereviewhub.modules.auth.service.TokenIssuer.AuthResult;
import com.moviereviewhub.modules.user.dto.AccountSettingsResponse;
import com.moviereviewhub.modules.user.dto.AccountStatsResponse;
import com.moviereviewhub.modules.user.dto.AvailabilityResponse;
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
import com.moviereviewhub.modules.user.service.UserService;
import com.moviereviewhub.security.userdetails.CustomUserDetails;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.http.CacheControl;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Validated
public class UserController {

    private final UserService userService;
    private final JwtProperties jwtProperties;
    private final CookieProperties cookieProperties;

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(UserResponse.from(requireAuth(principal).getUser()));
    }

    /**
     * Perfil publico. Sin auth. Cache corto para no martillar DB con scrapers/bots.
     */
    @GetMapping("/{id:\\d+}/profile")
    public ResponseEntity<PublicProfileResponse> publicProfile(@PathVariable Long id) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(60, TimeUnit.SECONDS).cachePublic())
                .body(userService.getPublicProfile(id));
    }

    /** Canonical public profile by username handle (or public_id fallback). */
    @GetMapping("/{username:(?!me$)(?!availability$)(?!\\d+$)[A-Za-z0-9_.-]+}/profile")
    public ResponseEntity<PublicProfileResponse> publicProfileByUsername(@PathVariable String username) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(60, TimeUnit.SECONDS).cachePublic())
                .body(userService.getPublicProfileByUsername(username));
    }

    @PatchMapping("/me/profile")
    public ResponseEntity<PublicProfileResponse> updateProfile(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody UpdateProfileRequest req
    ) {
        return ResponseEntity.ok(userService.updateProfile(requireAuth(principal).getUser(), req));
    }

    @GetMapping("/me/settings")
    public ResponseEntity<AccountSettingsResponse> mySettings(
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        return ResponseEntity.ok(userService.getSettings(requireAuth(principal).getUser()));
    }

    @PatchMapping("/me/settings")
    public ResponseEntity<AccountSettingsResponse> updateSettings(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody UpdateAccountSettingsRequest req
    ) {
        return ResponseEntity.ok(userService.updateSettings(requireAuth(principal).getUser(), req));
    }

    @PostMapping(value = "/me/avatar", consumes = "multipart/form-data")
    public ResponseEntity<UserResponse> uploadAvatar(
            @AuthenticationPrincipal CustomUserDetails principal,
            @RequestPart("file") MultipartFile file
    ) {
        return ResponseEntity.ok(userService.uploadAvatar(requireAuth(principal).getUser(), file));
    }

    @DeleteMapping("/me/avatar")
    public ResponseEntity<UserResponse> removeAvatar(
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        return ResponseEntity.ok(userService.removeAvatar(requireAuth(principal).getUser()));
    }

    @GetMapping("/me/stats")
    public ResponseEntity<AccountStatsResponse> myStats(@AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(userService.getStats(requireAuth(principal).getUser()));
    }

    @GetMapping("/availability/username")
    public ResponseEntity<AvailabilityResponse> usernameAvailable(
            @AuthenticationPrincipal CustomUserDetails principal,
            @RequestParam @NotBlank String value
    ) {
        var user = requireAuth(principal).getUser();
        return ResponseEntity.ok(AvailabilityResponse.of(
                userService.isUsernameAvailable(value, user.getId())
        ));
    }

    @GetMapping("/availability/email")
    public ResponseEntity<AvailabilityResponse> emailAvailable(
            @AuthenticationPrincipal CustomUserDetails principal,
            @RequestParam @NotBlank @Email String value
    ) {
        var user = requireAuth(principal).getUser();
        return ResponseEntity.ok(AvailabilityResponse.of(
                userService.isEmailAvailable(value, user.getId())
        ));
    }

    @PatchMapping("/me/username")
    public ResponseEntity<UserResponse> updateUsername(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody UpdateUsernameRequest req
    ) {
        return ResponseEntity.ok(userService.updateUsername(requireAuth(principal).getUser(), req));
    }

    @PostMapping("/me/profile/complete")
    public ResponseEntity<UserResponse> completeProfile(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody CompleteProfileRequest req
    ) {
        return ResponseEntity.ok(userService.completeProfile(requireAuth(principal).getUser(), req));
    }

    @PatchMapping("/me/email")
    public ResponseEntity<AuthResponse> updateEmail(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody UpdateEmailRequest req
    ) {
        AuthResult result = userService.updateEmail(requireAuth(principal).getUser(), req);
        ResponseCookie cookie = buildRefreshCookie(result.refreshToken());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(result.body());
    }

    @PatchMapping("/me/password")
    public ResponseEntity<Void> changePassword(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody ChangePasswordRequest req
    ) {
        userService.changePassword(requireAuth(principal).getUser(), req);
        ResponseCookie clear = buildClearCookie();
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, clear.toString())
                .build();
    }

    /**
     * Enable local email/password sign-in for an OAuth-only account.
     * Refuses (409) if the account already has a local password.
     * Revokes refresh tokens so the user signs in again with the new method.
     */
    @PostMapping("/me/password/set")
    public ResponseEntity<Void> setLocalPassword(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody SetPasswordRequest req
    ) {
        userService.setLocalPassword(requireAuth(principal).getUser(), req);
        ResponseCookie clear = buildClearCookie();
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, clear.toString())
                .build();
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteAccount(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody DeleteAccountRequest req
    ) {
        userService.deleteAccount(requireAuth(principal).getUser(), req);
        ResponseCookie clear = buildClearCookie();
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, clear.toString())
                .build();
    }

    private CustomUserDetails requireAuth(CustomUserDetails principal) {
        if (principal == null) {
            throw new UnauthorizedException("Not authenticated");
        }
        return principal;
    }

    private ResponseCookie buildRefreshCookie(String token) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(cookieProperties.refreshTokenName(), token)
                .httpOnly(true)
                .secure(cookieProperties.secure())
                .sameSite(cookieProperties.sameSite())
                .path(cookieProperties.path())
                .maxAge(jwtProperties.refreshExpirationMs() / 1000);
        if (cookieProperties.domain() != null && !cookieProperties.domain().isBlank()) {
            builder.domain(cookieProperties.domain());
        }
        return builder.build();
    }

    private ResponseCookie buildClearCookie() {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(cookieProperties.refreshTokenName(), "")
                .httpOnly(true)
                .secure(cookieProperties.secure())
                .sameSite(cookieProperties.sameSite())
                .path(cookieProperties.path())
                .maxAge(0);
        if (cookieProperties.domain() != null && !cookieProperties.domain().isBlank()) {
            builder.domain(cookieProperties.domain());
        }
        return builder.build();
    }
}
