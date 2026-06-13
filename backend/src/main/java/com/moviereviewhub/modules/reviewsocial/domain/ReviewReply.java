package com.moviereviewhub.modules.reviewsocial.domain;

import com.moviereviewhub.common.domain.BaseEntity;
import com.moviereviewhub.modules.user.domain.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Builder.Default;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "review_replies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewReply extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 10)
    private ReviewTargetType targetType;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    /**
     * Optional pointer to a sibling reply this one is answering. Top-level
     * replies (those that answer the root review directly) leave this null.
     * Service-side FK guard ensures the parent is on the same target.
     */
    @Column(name = "parent_reply_id")
    private Long parentReplyId;

    /**
     * 0 for top-level, 1 for direct child, … Capped at MAX_DEPTH (see
     * ReviewReplyService); CHECK constraint enforces 0–3 in DB.
     */
    @Column(name = "depth", nullable = false)
    private Short depth;

    /**
     * Id of the top-level reply at the root of this thread. NULL when this
     * reply IS the root (top-level). Lets us load an entire thread with a
     * single indexed scan: WHERE id = :rootId OR root_reply_id = :rootId.
     */
    @Column(name = "root_reply_id")
    private Long rootReplyId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    // Denormalized counter maintained by DB trigger (V19). Read-only.
    @Default
    @Column(name = "like_count", nullable = false, insertable = false, updatable = false)
    private Integer likeCount = 0;
}
