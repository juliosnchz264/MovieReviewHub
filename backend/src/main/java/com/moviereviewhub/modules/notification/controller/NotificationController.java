package com.moviereviewhub.modules.notification.controller;

import com.moviereviewhub.common.dto.PagedResponse;
import com.moviereviewhub.modules.notification.dto.MarkReadRequest;
import com.moviereviewhub.modules.notification.dto.NotificationResponse;
import com.moviereviewhub.modules.notification.dto.UnreadCountResponse;
import com.moviereviewhub.modules.notification.service.NotificationQueryService;
import com.moviereviewhub.modules.notification.service.SseNotificationBroker;
import com.moviereviewhub.security.userdetails.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationQueryService queryService;
    private final SseNotificationBroker broker;

    private void pushUnreadCount(Long userId) {
        broker.publishUnreadCount(userId, queryService.unreadCount(userId));
    }

    @GetMapping
    public ResponseEntity<PagedResponse<NotificationResponse>> list(
            @AuthenticationPrincipal CustomUserDetails principal,
            @RequestParam(name = "filter", required = false, defaultValue = "all") String filter,
            @PageableDefault(size = 20) Pageable pageable) {
        boolean unreadOnly = "unread".equalsIgnoreCase(filter);
        return ResponseEntity.ok(queryService.list(principal.getId(), unreadOnly, pageable));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<UnreadCountResponse> unreadCount(
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(new UnreadCountResponse(queryService.unreadCount(principal.getId())));
    }

    @PostMapping("/mark-read")
    public ResponseEntity<Void> markRead(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody MarkReadRequest req) {
        queryService.markRead(principal.getId(), req.ids());
        pushUnreadCount(principal.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/mark-all-read")
    public ResponseEntity<Void> markAllRead(
            @AuthenticationPrincipal CustomUserDetails principal) {
        queryService.markAllRead(principal.getId());
        pushUnreadCount(principal.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/mark-seen")
    public ResponseEntity<Void> markSeen(
            @AuthenticationPrincipal CustomUserDetails principal) {
        queryService.markAllSeen(principal.getId());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id:\\d+}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable Long id) {
        queryService.delete(principal.getId(), id);
        pushUnreadCount(principal.getId());
        return ResponseEntity.noContent().build();
    }
}
