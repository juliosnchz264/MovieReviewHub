package com.moviereviewhub.modules.reviewsocial.repository;

import com.moviereviewhub.modules.reviewsocial.domain.ReviewReply;
import com.moviereviewhub.modules.reviewsocial.domain.ReviewTargetType;
import com.moviereviewhub.modules.reviewsocial.dto.TargetCountRow;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ReviewReplyRepository extends JpaRepository<ReviewReply, Long> {

    Optional<ReviewReply> findByIdAndDeletedFalse(Long id);

    long countByTargetTypeAndTargetIdAndDeletedFalse(
            ReviewTargetType targetType, Long targetId);

    @Query("""
            SELECT r FROM ReviewReply r
            JOIN FETCH r.user
            WHERE r.targetType = :t AND r.targetId = :id AND r.deleted = false
            ORDER BY r.createdAt ASC, r.id ASC
            """)
    Page<ReviewReply> findActiveByTarget(
            @Param("t") ReviewTargetType targetType,
            @Param("id") Long targetId,
            Pageable pageable);

    @Query("""
            SELECT new com.moviereviewhub.modules.reviewsocial.dto.TargetCountRow(
                r.targetId, COUNT(r))
            FROM ReviewReply r
            WHERE r.targetType = :t AND r.targetId IN :ids AND r.deleted = false
            GROUP BY r.targetId
            """)
    List<TargetCountRow> countRepliesGrouped(
            @Param("t") ReviewTargetType targetType,
            @Param("ids") Collection<Long> ids);

    @Modifying
    @Query("""
            UPDATE ReviewReply r SET r.deleted = true
            WHERE r.targetType = :t AND r.targetId = :id AND r.deleted = false
            """)
    int softDeleteAllForTarget(
            @Param("t") ReviewTargetType targetType,
            @Param("id") Long targetId);
}
