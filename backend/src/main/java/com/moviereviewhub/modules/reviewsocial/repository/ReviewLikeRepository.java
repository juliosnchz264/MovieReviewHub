package com.moviereviewhub.modules.reviewsocial.repository;

import com.moviereviewhub.modules.reviewsocial.domain.ReviewLike;
import com.moviereviewhub.modules.reviewsocial.domain.ReviewLikeId;
import com.moviereviewhub.modules.reviewsocial.domain.ReviewTargetType;
import com.moviereviewhub.modules.reviewsocial.dto.TargetCountRow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface ReviewLikeRepository extends JpaRepository<ReviewLike, ReviewLikeId> {

    boolean existsByUserIdAndTargetTypeAndTargetId(
            Long userId, ReviewTargetType targetType, Long targetId);

    @Modifying
    long deleteByUserIdAndTargetTypeAndTargetId(
            Long userId, ReviewTargetType targetType, Long targetId);

    long countByTargetTypeAndTargetId(ReviewTargetType targetType, Long targetId);

    @Modifying
    @Query("DELETE FROM ReviewLike l WHERE l.targetType = :t AND l.targetId = :id")
    int deleteAllForTarget(
            @Param("t") ReviewTargetType targetType,
            @Param("id") Long targetId);

    @Query("""
            SELECT new com.moviereviewhub.modules.reviewsocial.dto.TargetCountRow(
                l.targetId, COUNT(l))
            FROM ReviewLike l
            WHERE l.targetType = :t AND l.targetId IN :ids
            GROUP BY l.targetId
            """)
    List<TargetCountRow> countLikesGrouped(
            @Param("t") ReviewTargetType targetType,
            @Param("ids") Collection<Long> ids);

    @Query("""
            SELECT l.targetId FROM ReviewLike l
            WHERE l.userId = :userId AND l.targetType = :t AND l.targetId IN :ids
            """)
    List<Long> findLikedTargetIds(
            @Param("userId") Long userId,
            @Param("t") ReviewTargetType targetType,
            @Param("ids") Collection<Long> ids);
}
