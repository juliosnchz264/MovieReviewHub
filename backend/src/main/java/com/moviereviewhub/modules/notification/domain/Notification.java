package com.moviereviewhub.modules.notification.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
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
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recipient_id", nullable = false)
    private Long recipientId;

    @Column(name = "actor_id")
    private Long actorId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private NotificationType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", length = 20)
    private NotificationTargetType targetType;

    @Column(name = "target_id")
    private Long targetId;

    @Enumerated(EnumType.STRING)
    @Column(name = "context_type", length = 20)
    private NotificationTargetType contextType;

    @Column(name = "context_id")
    private Long contextId;

    @Column(name = "read_at")
    private Instant readAt;

    @Column(name = "seen_at")
    private Instant seenAt;

    @Column(name = "group_key", length = 120)
    private String groupKey;

    @Column(name = "group_count", nullable = false)
    @Builder.Default
    private int groupCount = 1;

    @Column(name = "last_actor_id")
    private Long lastActorId;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
