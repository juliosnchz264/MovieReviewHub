package com.moviereviewhub.modules.notification.service;

import com.moviereviewhub.modules.notification.domain.Notification;
import com.moviereviewhub.modules.notification.domain.NotificationTargetType;
import com.moviereviewhub.modules.notification.domain.NotificationType;
import com.moviereviewhub.modules.notification.repository.NotificationRepository;
import com.moviereviewhub.modules.reviewsocial.domain.ReviewTargetType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Core notification writer. Methods are designed to be invoked from
 * AFTER_COMMIT event listeners, so each runs in its own transaction
 * (REQUIRES_NEW) — a failure here must never roll back the originating
 * action.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository repository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Optional<Notification> onReviewLiked(
            Long actorId, Long ownerId, ReviewTargetType kind, Long reviewId) {
        if (actorId == null || ownerId == null || actorId.equals(ownerId)) {
            return Optional.empty();
        }
        NotificationTargetType target = mapReviewKind(kind);
        String groupKey = "LIKE:" + target.name() + ":" + reviewId;

        repository.upsertGrouped(
                ownerId,
                actorId,
                NotificationType.REVIEW_LIKED.name(),
                target.name(),
                reviewId,
                null,
                null,
                groupKey
        );
        return loadActive(ownerId, groupKey);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Optional<Notification> onReviewReplied(
            Long actorId, Long ownerId, ReviewTargetType kind,
            Long reviewId, Long replyId) {
        if (actorId == null || ownerId == null || actorId.equals(ownerId)) {
            return Optional.empty();
        }
        NotificationTargetType contextType = mapReviewKind(kind);
        String groupKey = "REPLY:" + contextType.name() + ":" + reviewId;

        repository.upsertGrouped(
                ownerId,
                actorId,
                NotificationType.REVIEW_REPLIED.name(),
                NotificationTargetType.REPLY.name(),
                replyId,
                contextType.name(),
                reviewId,
                groupKey
        );
        return loadActive(ownerId, groupKey);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Optional<Notification> onReplyAnswered(
            Long actorId, Long parentAuthorId, ReviewTargetType kind,
            Long reviewId, Long parentReplyId, Long replyId) {
        if (actorId == null || parentAuthorId == null || actorId.equals(parentAuthorId)) {
            return Optional.empty();
        }
        NotificationTargetType contextType = mapReviewKind(kind);
        // Group all answers to the same parent reply while still unread.
        String groupKey = "REPLY_ANSWER:" + parentReplyId;

        repository.upsertGrouped(
                parentAuthorId,
                actorId,
                NotificationType.REPLY_ANSWERED.name(),
                NotificationTargetType.REPLY.name(),
                replyId,
                contextType.name(),
                reviewId,
                groupKey
        );
        return loadActive(parentAuthorId, groupKey);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Optional<Notification> onReplyLiked(
            Long actorId, Long ownerId, ReviewTargetType reviewKind,
            Long reviewId, Long replyId) {
        if (actorId == null || ownerId == null || actorId.equals(ownerId)) {
            return Optional.empty();
        }
        NotificationTargetType contextType = mapReviewKind(reviewKind);
        // Group all likes on the same reply while still unread.
        String groupKey = "LIKE_REPLY:" + replyId;

        repository.upsertGrouped(
                ownerId,
                actorId,
                NotificationType.REPLY_LIKED.name(),
                NotificationTargetType.REPLY.name(),
                replyId,
                contextType.name(),
                reviewId,
                groupKey
        );
        return loadActive(ownerId, groupKey);
    }

    /**
     * Fan-out write: notify every {@code recipientId} of activity in a thread
     * they participated in. Grouped under a per-review key so a chatty thread
     * collapses to one unread row per recipient instead of one per reply.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onThreadActivity(
            Long actorId, java.util.Set<Long> recipientIds,
            ReviewTargetType reviewKind, Long reviewId, Long replyId) {
        if (actorId == null || recipientIds == null || recipientIds.isEmpty()) return;
        NotificationTargetType contextType = mapReviewKind(reviewKind);
        String groupKey = "THREAD:" + contextType.name() + ":" + reviewId;

        for (Long recipientId : recipientIds) {
            if (recipientId == null || recipientId.equals(actorId)) continue;
            try {
                repository.upsertGrouped(
                        recipientId,
                        actorId,
                        NotificationType.THREAD_ACTIVITY.name(),
                        NotificationTargetType.REPLY.name(),
                        replyId,
                        contextType.name(),
                        reviewId,
                        groupKey
                );
            } catch (Exception e) {
                log.warn("Failed THREAD_ACTIVITY notification for recipient={}, reply={}",
                        recipientId, replyId, e);
            }
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int onReplyDeleted(Long replyId) {
        return repository.deleteByTarget(NotificationTargetType.REPLY, replyId);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int onReviewDeleted(ReviewTargetType kind, Long reviewId) {
        NotificationTargetType target = mapReviewKind(kind);
        return repository.deleteByTarget(target, reviewId);
    }

    /**
     * Fetch the currently-unread row for a recipient + group_key. The partial
     * unique index idx_notifications_group_active guarantees at most one such
     * row exists at any time, so this is the canonical hydration step after
     * an UPSERT.
     */
    private Optional<Notification> loadActive(Long recipientId, String groupKey) {
        return repository.findByRecipientIdAndGroupKeyAndReadAtIsNull(recipientId, groupKey);
    }

    private NotificationTargetType mapReviewKind(ReviewTargetType kind) {
        return switch (kind) {
            case MOVIE -> NotificationTargetType.REVIEW_MOVIE;
            case SERIES -> NotificationTargetType.REVIEW_SERIES;
        };
    }
}
