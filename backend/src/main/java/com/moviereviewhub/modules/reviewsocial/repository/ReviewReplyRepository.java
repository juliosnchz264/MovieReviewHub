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

    /**
     * Same as {@link #findByIdAndDeletedFalse} but eager-fetches the author.
     * Used by the ancestry walker so each step doesn't trip a lazy-load on
     * {@code reply.getUser()} during enrichment.
     */
    @Query("""
            SELECT r FROM ReviewReply r
            JOIN FETCH r.user
            WHERE r.id = :id AND r.deleted = false
            """)
    Optional<ReviewReply> findByIdAndDeletedFalseWithUser(@Param("id") Long id);

    long countByTargetTypeAndTargetIdAndDeletedFalse(
            ReviewTargetType targetType, Long targetId);

    /**
     * Top-level replies only (parent_reply_id IS NULL). Threaded UI paginates
     * roots; descendants load on demand via {@link #findThreadByRoot}.
     * Deleting a reply cascades to its whole subtree, so a deleted reply never
     * anchors a live thread — only active rows are returned.
     */
    @Query("""
            SELECT r FROM ReviewReply r
            JOIN FETCH r.user
            WHERE r.targetType = :t AND r.targetId = :id
              AND r.parentReplyId IS NULL
              AND r.deleted = false
            ORDER BY r.createdAt ASC, r.id ASC
            """)
    Page<ReviewReply> findTopLevelByTarget(
            @Param("t") ReviewTargetType targetType,
            @Param("id") Long targetId,
            Pageable pageable);

    /**
     * Ids of an entire reply subtree rooted at {@code rootId} (inclusive),
     * walking parent → child. Bounded by MAX_DEPTH. Used to cascade a delete
     * so removing a comment also removes every nested reply under it, like a
     * social feed.
     */
    @Query(value = """
            WITH RECURSIVE sub AS (
                SELECT id FROM review_replies WHERE id = :rootId
                UNION ALL
                SELECT r.id FROM review_replies r
                  JOIN sub ON r.parent_reply_id = sub.id
            )
            SELECT id FROM sub
            """, nativeQuery = true)
    List<Long> findSubtreeIds(@Param("rootId") Long rootId);

    /** Bulk soft-delete by id; the count trigger fires per row. */
    @Modifying
    @Query("UPDATE ReviewReply r SET r.deleted = true WHERE r.id IN :ids AND r.deleted = false")
    int softDeleteByIds(@Param("ids") Collection<Long> ids);

    /**
     * Every active reply in a thread, including the root itself. Top-level
     * replies have {@code root_reply_id IS NULL} (they ARE the root), so we
     * match both forms with one query: {@code id = :rootId OR root_reply_id
     * = :rootId}. Order is stable by (createdAt, id) so the frontend builds
     * the tree in one pass.
     */
    @Query("""
            SELECT r FROM ReviewReply r
            JOIN FETCH r.user
            WHERE (r.id = :rootId OR r.rootReplyId = :rootId)
              AND r.deleted = false
            ORDER BY r.createdAt ASC, r.id ASC
            """)
    List<ReviewReply> findThreadByRoot(@Param("rootId") Long rootId);

    /**
     * Direct children of a reply, paginated. Backs the lazy "Show N replies"
     * per-level expansion: opening a node loads only its immediate children
     * (not the whole subtree), avoiding recursive over-fetch.
     */
    @Query("""
            SELECT r FROM ReviewReply r
            JOIN FETCH r.user
            WHERE r.parentReplyId = :parentId AND r.deleted = false
            ORDER BY r.createdAt ASC, r.id ASC
            """)
    Page<ReviewReply> findActiveChildren(
            @Param("parentId") Long parentId, Pageable pageable);

    /**
     * Batch direct-child count for a set of reply ids. Used by the list
     * endpoint to show "N replies" affordances without per-row queries.
     */
    @Query("""
            SELECT new com.moviereviewhub.modules.reviewsocial.dto.TargetCountRow(
                r.parentReplyId, COUNT(r))
            FROM ReviewReply r
            WHERE r.parentReplyId IN :parentIds AND r.deleted = false
            GROUP BY r.parentReplyId
            """)
    List<com.moviereviewhub.modules.reviewsocial.dto.TargetCountRow> countDirectChildrenGrouped(
            @Param("parentIds") Collection<Long> parentIds);

    /**
     * Distinct user ids of everyone who has posted a (non-deleted) reply in
     * the same branch (sharing {@code root_reply_id}) as a newly created
     * reply, including the root reply's own author. Used to fan out
     * THREAD_ACTIVITY notifications strictly to prior participants of that
     * conversation branch — not to unrelated participants of other branches
     * on the same review.
     */
    @Query("""
            SELECT DISTINCT r.user.id FROM ReviewReply r
            WHERE (r.id = :rootId OR r.rootReplyId = :rootId)
              AND r.deleted = false
            """)
    List<Long> findBranchParticipantIds(@Param("rootId") Long rootReplyId);

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

    /**
     * Notification hydration: include soft-deleted so we can render a
     * tombstone (preview suppressed) when the reply has been removed.
     */
    @Query("""
            SELECT r FROM ReviewReply r
            WHERE r.id IN :ids
            """)
    List<ReviewReply> findAllByIdsIncludingDeleted(@Param("ids") Collection<Long> ids);
}
