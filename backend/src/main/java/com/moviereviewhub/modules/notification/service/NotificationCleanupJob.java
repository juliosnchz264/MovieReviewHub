package com.moviereviewhub.modules.notification.service;

import com.moviereviewhub.modules.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

/**
 * Daily retention sweep. Deletes notifications that have been read and are
 * older than {@link #RETENTION}. Unread notifications are never purged so a
 * returning user always sees their backlog.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationCleanupJob {

    private static final Duration RETENTION = Duration.ofDays(90);

    private final NotificationRepository repository;

    @Scheduled(cron = "${app.notifications.cleanup-cron:0 0 3 * * *}", zone = "UTC")
    @Transactional
    public void purgeExpired() {
        Instant cutoff = Instant.now().minus(RETENTION);
        int removed = repository.deleteReadOlderThan(cutoff);
        if (removed > 0) {
            log.info("Notification retention sweep removed {} read rows older than {}", removed, cutoff);
        }
    }
}
