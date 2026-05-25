package com.moviereviewhub.modules.notification.service;

import com.moviereviewhub.common.dto.PagedResponse;
import com.moviereviewhub.exception.NotFoundException;
import com.moviereviewhub.modules.notification.domain.Notification;
import com.moviereviewhub.modules.notification.dto.NotificationResponse;
import com.moviereviewhub.modules.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collection;

/**
 * Read + state-mutation endpoints for the bell. All queries are scoped to
 * the current recipient at the repository layer, so a leaked id cannot
 * expose another user's notification.
 */
@Service
@RequiredArgsConstructor
public class NotificationQueryService {

    private final NotificationRepository repository;
    private final NotificationMapper mapper;

    @Transactional(readOnly = true)
    public PagedResponse<NotificationResponse> list(
            Long recipientId, boolean unreadOnly, Pageable pageable) {
        Page<Notification> page = unreadOnly
                ? repository.findByRecipientIdAndReadAtIsNullOrderByCreatedAtDescIdDesc(
                        recipientId, pageable)
                : repository.findByRecipientIdOrderByCreatedAtDescIdDesc(recipientId, pageable);
        return mapper.mapPage(page);
    }

    @Transactional(readOnly = true)
    public long unreadCount(Long recipientId) {
        return repository.countByRecipientIdAndReadAtIsNull(recipientId);
    }

    @Transactional
    public int markRead(Long recipientId, Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) return 0;
        return repository.markRead(recipientId, ids, Instant.now());
    }

    @Transactional
    public int markAllRead(Long recipientId) {
        return repository.markAllRead(recipientId, Instant.now());
    }

    @Transactional
    public int markAllSeen(Long recipientId) {
        return repository.markAllSeen(recipientId, Instant.now());
    }

    @Transactional
    public void delete(Long recipientId, Long notificationId) {
        Notification n = repository.findByIdAndRecipientId(notificationId, recipientId)
                .orElseThrow(() -> new NotFoundException("Notification not found"));
        repository.delete(n);
    }
}
