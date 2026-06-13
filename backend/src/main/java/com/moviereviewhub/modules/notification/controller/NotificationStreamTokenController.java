package com.moviereviewhub.modules.notification.controller;

import com.moviereviewhub.modules.notification.dto.SseTokenResponse;
import com.moviereviewhub.modules.user.repository.UserRepository;
import com.moviereviewhub.security.jwt.JwtService;
import com.moviereviewhub.security.userdetails.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Issues a 60s scope=sse token used by the browser EventSource. We rely on
 * the access token (Authorization header) here, then hand the client a token
 * narrow enough that leaking it via Referer / proxy logs only buys a brief
 * replay of the notifications stream and nothing else.
 */
@RestController
@RequiredArgsConstructor
public class NotificationStreamTokenController {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @PostMapping("/api/v1/notifications/stream-token")
    public ResponseEntity<SseTokenResponse> issue(
            @AuthenticationPrincipal CustomUserDetails principal) {
        var user = userRepository.findById(principal.getId()).orElseThrow();
        String token = jwtService.generateSseToken(user);
        return ResponseEntity.ok(new SseTokenResponse(token, 60));
    }
}
