package com.moviereviewhub.modules.reviewsocial.repository;

import com.moviereviewhub.modules.reviewsocial.domain.ReplyLike;
import com.moviereviewhub.modules.reviewsocial.domain.ReplyLikeId;
import com.moviereviewhub.modules.reviewsocial.dto.TargetCountRow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface ReplyLikeRepository extends JpaRepository<ReplyLike, ReplyLikeId> {

    boolean existsByUserIdAndReplyId(Long userId, Long replyId);

    @Modifying
    long deleteByUserIdAndReplyId(Long userId, Long replyId);

    long countByReplyId(Long replyId);

    /**
     * Batch like-count for a set of reply ids. Reused by ReviewReplyService.list
     * to enrich a page of replies without per-row queries.
     */
    @Query("""
            SELECT new com.moviereviewhub.modules.reviewsocial.dto.TargetCountRow(
                l.replyId, COUNT(l))
            FROM ReplyLike l
            WHERE l.replyId IN :ids
            GROUP BY l.replyId
            """)
    List<TargetCountRow> countLikesGrouped(@Param("ids") Collection<Long> ids);

    /**
     * Which of the given reply ids has the user liked? Empty list when caller
     * is anonymous so the service can skip this call.
     */
    @Query("""
            SELECT l.replyId FROM ReplyLike l
            WHERE l.userId = :userId AND l.replyId IN :ids
            """)
    List<Long> findLikedReplyIds(
            @Param("userId") Long userId,
            @Param("ids") Collection<Long> ids);
}
