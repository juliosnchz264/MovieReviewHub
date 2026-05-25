package com.moviereviewhub.modules.notification.repository;

import com.moviereviewhub.modules.notification.domain.Notification;
import com.moviereviewhub.modules.notification.domain.NotificationTargetType;
import com.moviereviewhub.modules.notification.domain.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByRecipientIdOrderByCreatedAtDescIdDesc(Long recipientId, Pageable pageable);

    Page<Notification> findByRecipientIdAndReadAtIsNullOrderByCreatedAtDescIdDesc(
            Long recipientId, Pageable pageable);

    long countByRecipientIdAndReadAtIsNull(Long recipientId);

    Optional<Notification> findByIdAndRecipientId(Long id, Long recipientId);

    /**
     * Atomic upsert that groups concurrent events for the same recipient/group_key
     * while still unread. The partial unique index idx_notifications_group_active
     * is the conflict target. On collision we bump group_count and refresh the
     * last actor; on miss we insert a fresh row with group_count = 1.
     *
     * Spring Data JPA restricts {@code @Modifying} return types to {@code void}
     * or {@code int}/{@code Integer}, so we cannot return the affected id here.
     * Callers fetch the row separately via
     * {@link #findByRecipientIdAndGroupKeyAndReadAtIsNull(Long, String)}.
     */
    @Modifying
    @Query(value = """
            INSERT INTO notifications (
                recipient_id, actor_id, type,
                target_type, target_id,
                context_type, context_id,
                group_key, group_count, last_actor_id,
                created_at, updated_at
            )
            VALUES (
                :recipientId, :actorId, :type,
                :targetType, :targetId,
                :contextType, :contextId,
                :groupKey, 1, :actorId,
                now(), now()
            )
            ON CONFLICT (recipient_id, group_key)
                WHERE read_at IS NULL AND group_key IS NOT NULL
            DO UPDATE SET
                group_count   = notifications.group_count + 1,
                last_actor_id = EXCLUDED.last_actor_id,
                actor_id      = COALESCE(notifications.actor_id, EXCLUDED.actor_id),
                target_type   = EXCLUDED.target_type,
                target_id     = EXCLUDED.target_id,
                context_type  = EXCLUDED.context_type,
                context_id    = EXCLUDED.context_id,
                updated_at    = now()
            """, nativeQuery = true)
    int upsertGrouped(
            @Param("recipientId") Long recipientId,
            @Param("actorId") Long actorId,
            @Param("type") String type,
            @Param("targetType") String targetType,
            @Param("targetId") Long targetId,
            @Param("contextType") String contextType,
            @Param("contextId") Long contextId,
            @Param("groupKey") String groupKey
    );

    @Modifying
    @Query("""
            UPDATE Notification n
               SET n.readAt = :readAt
             WHERE n.recipientId = :recipientId
               AND n.id IN :ids
               AND n.readAt IS NULL
            """)
    int markRead(
            @Param("recipientId") Long recipientId,
            @Param("ids") Collection<Long> ids,
            @Param("readAt") Instant readAt
    );

    @Modifying
    @Query("""
            UPDATE Notification n
               SET n.readAt = :readAt
             WHERE n.recipientId = :recipientId
               AND n.readAt IS NULL
            """)
    int markAllRead(
            @Param("recipientId") Long recipientId,
            @Param("readAt") Instant readAt
    );

    @Modifying
    @Query("""
            UPDATE Notification n
               SET n.seenAt = :seenAt
             WHERE n.recipientId = :recipientId
               AND n.seenAt IS NULL
            """)
    int markAllSeen(
            @Param("recipientId") Long recipientId,
            @Param("seenAt") Instant seenAt
    );

    @Modifying
    @Query("""
            DELETE FROM Notification n
             WHERE (n.targetType = :targetType AND n.targetId = :targetId)
                OR (n.contextType = :targetType AND n.contextId = :targetId)
            """)
    int deleteByTarget(
            @Param("targetType") NotificationTargetType targetType,
            @Param("targetId") Long targetId
    );

    /**
     * Find the active (unread) grouped notification for batch hydration / SSE.
     * Used after upsertGrouped() to fetch the full row.
     */
    Optional<Notification> findByRecipientIdAndGroupKeyAndReadAtIsNull(
            Long recipientId, String groupKey);

    List<Notification> findAllByIdIn(Collection<Long> ids);

    long countByTypeAndRecipientId(NotificationType type, Long recipientId);

    /**
     * Retention: physically remove notifications that have been read and are
     * older than the cutoff. Unread notifications are kept indefinitely so
     * users who return after a long absence can still see their backlog.
     */
    @Modifying
    @Query("""
            DELETE FROM Notification n
             WHERE n.readAt IS NOT NULL
               AND n.readAt < :cutoff
            """)
    int deleteReadOlderThan(@Param("cutoff") Instant cutoff);
}
