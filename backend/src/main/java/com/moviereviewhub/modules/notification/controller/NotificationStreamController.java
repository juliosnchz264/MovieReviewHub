package com.moviereviewhub.modules.notification.controller;

import com.moviereviewhub.modules.notification.service.SseNotificationBroker;
import com.moviereviewhub.security.userdetails.CustomUserDetails;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequiredArgsConstructor
public class NotificationStreamController {

    private final SseNotificationBroker broker;

    /**
     * Long-lived SSE stream. Authenticated via the standard Bearer header
     * (server-to-server) or, for browser EventSource, via an
     * {@code ?access_token=…} query parameter accepted only on this path.
     */
    @GetMapping(path = "/api/v1/notifications/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@AuthenticationPrincipal CustomUserDetails principal,
                             HttpServletResponse response) {
        // Disable proxy buffering so events flush in real time.
        response.setHeader("Cache-Control", "no-cache, no-transform");
        response.setHeader("X-Accel-Buffering", "no");
        response.setHeader("Connection", "keep-alive");
        return broker.register(principal.getId());
    }
}
