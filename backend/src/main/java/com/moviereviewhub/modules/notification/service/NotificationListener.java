package com.moviereviewhub.modules.notification.service;

import com.moviereviewhub.modules.notification.domain.Notification;
import com.moviereviewhub.modules.notification.dto.NotificationResponse;
import com.moviereviewhub.modules.notification.repository.NotificationRepository;
import com.moviereviewhub.modules.notification.service.event.ReplyAnsweredEvent;
import com.moviereviewhub.modules.notification.service.event.ReplyDeletedEvent;
import com.moviereviewhub.modules.notification.service.event.ReplyLikedEvent;
import com.moviereviewhub.modules.notification.service.event.ReviewDeletedEvent;
import com.moviereviewhub.modules.notification.service.event.ReviewLikedEvent;
import com.moviereviewhub.modules.notification.service.event.ReviewRepliedEvent;
import com.moviereviewhub.modules.notification.service.event.ThreadActivityEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.Optional;

/**
 * Bridges domain events to the notification writer. Listeners only fire
 * AFTER_COMMIT of the originating transaction, so the like/reply is
 * already durable by the time a notification row is attempted. Errors
 * are logged and swallowed — a notification miss is preferable to a
 * cascading 500 on the user-facing action.
 *
 * After the notification is persisted, the listener pushes the hydrated
 * payload to any active SSE subscribers so the recipient sees the bell
 * update instantly without waiting for the next poll.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationListener {

    private final NotificationService notificationService;
    private final NotificationMapper mapper;
    private final NotificationRepository repository;
    private final SseNotificationBroker broker;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onReviewLiked(ReviewLikedEvent event) {
        try {
            Optional<Notification> n = notificationService.onReviewLiked(
                    event.actorId(), event.ownerId(), event.kind(), event.reviewId());
            pushIfPresent(event.ownerId(), n);
        } catch (Exception e) {
            log.warn("Failed to write REVIEW_LIKED notification (owner={}, review={}, kind={})",
                    event.ownerId(), event.reviewId(), event.kind(), e);
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onReviewReplied(ReviewRepliedEvent event) {
        try {
            Optional<Notification> n = notificationService.onReviewReplied(
                    event.actorId(), event.ownerId(), event.kind(),
                    event.reviewId(), event.replyId());
            pushIfPresent(event.ownerId(), n);
        } catch (Exception e) {
            log.warn("Failed to write REVIEW_REPLIED notification (owner={}, review={}, reply={})",
                    event.ownerId(), event.reviewId(), event.replyId(), e);
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onReplyAnswered(ReplyAnsweredEvent event) {
        try {
            Optional<Notification> n = notificationService.onReplyAnswered(
                    event.actorId(), event.parentAuthorId(), event.kind(),
                    event.reviewId(), event.parentReplyId(), event.replyId());
            pushIfPresent(event.parentAuthorId(), n);
        } catch (Exception e) {
            log.warn("Failed to write REPLY_ANSWERED notification (parentAuthor={}, parentReply={}, reply={})",
                    event.parentAuthorId(), event.parentReplyId(), event.replyId(), e);
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onReplyLiked(ReplyLikedEvent event) {
        try {
            Optional<Notification> n = notificationService.onReplyLiked(
                    event.actorId(), event.ownerId(), event.reviewKind(),
                    event.reviewId(), event.replyId());
            pushIfPresent(event.ownerId(), n);
        } catch (Exception e) {
            log.warn("Failed to write REPLY_LIKED notification (owner={}, reply={})",
                    event.ownerId(), event.replyId(), e);
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onThreadActivity(ThreadActivityEvent event) {
        try {
            notificationService.onThreadActivity(
                    event.actorId(), event.recipientIds(), event.reviewKind(),
                    event.reviewId(), event.replyId());
            // Push each recipient's hydrated payload so the SSE feed reflects
            // the fan-out instantly. We re-fetch by groupKey via mapOne flow
            // through pushUpdated; cheaper than the per-recipient mapper when
            // the payload is identical save for recipient_id.
            pushThreadActivityToAll(event);
        } catch (Exception e) {
            log.warn("Failed THREAD_ACTIVITY fan-out (review={}, reply={}, recipients={})",
                    event.reviewId(), event.replyId(),
                    event.recipientIds() == null ? 0 : event.recipientIds().size(), e);
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onReplyDeleted(ReplyDeletedEvent event) {
        try {
            notificationService.onReplyDeleted(event.replyId());
        } catch (Exception e) {
            log.warn("Failed to clean up notifications for deleted reply (id={})",
                    event.replyId(), e);
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onReviewDeleted(ReviewDeletedEvent event) {
        try {
            notificationService.onReviewDeleted(event.kind(), event.reviewId());
        } catch (Exception e) {
            log.warn("Failed to clean up notifications for deleted review (kind={}, id={})",
                    event.kind(), event.reviewId(), e);
        }
    }

    /**
     * THREAD_ACTIVITY pushes one SSE event per recipient. We hydrate by
     * loading each recipient's active row for the group key produced inside
     * NotificationService — single indexed lookup per recipient.
     */
    private void pushThreadActivityToAll(ThreadActivityEvent event) {
        if (event.recipientIds() == null) return;
        com.moviereviewhub.modules.notification.domain.NotificationTargetType ctx =
                event.reviewKind() == com.moviereviewhub.modules.reviewsocial.domain.ReviewTargetType.MOVIE
                        ? com.moviereviewhub.modules.notification.domain.NotificationTargetType.REVIEW_MOVIE
                        : com.moviereviewhub.modules.notification.domain.NotificationTargetType.REVIEW_SERIES;
        String groupKey = "THREAD:" + ctx.name() + ":" + event.reviewId();
        for (Long recipientId : event.recipientIds()) {
            if (recipientId == null || recipientId.equals(event.actorId())) continue;
            Optional<Notification> n = repository
                    .findByRecipientIdAndGroupKeyAndReadAtIsNull(recipientId, groupKey);
            pushIfPresent(recipientId, n);
        }
    }

    private void pushIfPresent(Long recipientId, Optional<Notification> n) {
        if (n.isEmpty()) return;
        try {
            NotificationResponse payload = mapper.mapOne(n.get());
            broker.publishNotification(recipientId, payload);
            long unread = repository.countByRecipientIdAndReadAtIsNull(recipientId);
            broker.publishUnreadCount(recipientId, unread);
        } catch (Exception e) {
            log.warn("Failed to push notification to SSE subscribers (recipient={})", recipientId, e);
        }
    }
}
