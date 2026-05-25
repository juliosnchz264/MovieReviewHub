package com.moviereviewhub.modules.seriesreview.repository;

import com.moviereviewhub.modules.review.dto.MovieRatingStats;
import com.moviereviewhub.modules.seriesreview.domain.SeriesReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SeriesReviewRepository extends JpaRepository<SeriesReview, Long> {

    Optional<SeriesReview> findByIdAndDeletedFalse(Long id);

    boolean existsByUser_IdAndSeries_IdAndDeletedFalse(Long userId, Long seriesId);

    Optional<SeriesReview> findByUser_IdAndSeries_IdAndDeletedFalse(Long userId, Long seriesId);

    long countByDeletedFalse();

    @Query("""
            SELECT r.user.id FROM SeriesReview r
            WHERE r.id = :id AND r.deleted = false
            """)
    Optional<Long> findOwnerIdById(@Param("id") Long id);

    @Query("""
            SELECT r FROM SeriesReview r
            JOIN FETCH r.user
            WHERE r.series.id = :seriesId AND r.deleted = false
            ORDER BY r.createdAt DESC, r.id DESC
            """)
    Page<SeriesReview> findBySeriesId(@Param("seriesId") Long seriesId, Pageable pageable);

    @Query("""
            SELECT r FROM SeriesReview r
            JOIN FETCH r.series
            WHERE r.user.id = :userId AND r.deleted = false
            ORDER BY r.createdAt DESC, r.id DESC
            """)
    Page<SeriesReview> findByUserId(@Param("userId") Long userId, Pageable pageable);

    @Query("""
            SELECT new com.moviereviewhub.modules.review.dto.MovieRatingStats(
                COALESCE(AVG(CAST(r.rating AS double)) / 2.0, 0.0),
                COUNT(r))
            FROM SeriesReview r
            WHERE r.series.id = :seriesId AND r.deleted = false
            """)
    MovieRatingStats getRatingStats(@Param("seriesId") Long seriesId);

    @Query("""
            SELECT new com.moviereviewhub.modules.review.dto.MovieRatingStats(
                COALESCE(AVG(CAST(r.rating AS double)) / 2.0, 0.0),
                COUNT(r))
            FROM SeriesReview r
            WHERE r.user.id = :userId AND r.deleted = false
            """)
    MovieRatingStats getUserRatingStats(@Param("userId") Long userId);

    long countByUser_IdAndDeletedFalse(Long userId);

    /**
     * Hot-rank ids for a series. Same Reddit "hot" formula as
     * ReviewRepository.findPopularIds; see that method for math + rationale.
     * Also matches the engagement filter (must have at least one like or
     * reply) so a freshly-posted review doesn't crash the "Popular" tab.
     */
    @Query(value = """
            SELECT r.id FROM series_reviews r
            LEFT JOIN (
                SELECT target_id, COUNT(*) AS cnt FROM review_likes
                WHERE target_type = 'SERIES' GROUP BY target_id
            ) lk ON lk.target_id = r.id
            LEFT JOIN (
                SELECT target_id, COUNT(*) AS cnt FROM review_replies
                WHERE target_type = 'SERIES' AND deleted = false GROUP BY target_id
            ) rp ON rp.target_id = r.id
            WHERE r.series_id = :seriesId AND r.deleted = false
              AND (COALESCE(lk.cnt, 0) + COALESCE(rp.cnt, 0)) > 0
            ORDER BY (
                SIGN(COALESCE(lk.cnt, 0) + COALESCE(rp.cnt, 0) * 0.5)
                * LOG(GREATEST(COALESCE(lk.cnt, 0) + COALESCE(rp.cnt, 0) * 0.5, 1))
                + EXTRACT(EPOCH FROM r.created_at) / 45000.0
            ) DESC,
            r.created_at DESC,
            r.id DESC
            LIMIT :lim
            """, nativeQuery = true)
    List<Long> findPopularIds(@Param("seriesId") Long seriesId, @Param("lim") int limit);

    @Query(
            value = """
                    SELECT r.id FROM series_reviews r
                    LEFT JOIN (
                        SELECT target_id, COUNT(*) AS cnt FROM review_likes
                        WHERE target_type = 'SERIES' GROUP BY target_id
                    ) lk ON lk.target_id = r.id
                    LEFT JOIN (
                        SELECT target_id, COUNT(*) AS cnt FROM review_replies
                        WHERE target_type = 'SERIES' AND deleted = false GROUP BY target_id
                    ) rp ON rp.target_id = r.id
                    WHERE r.series_id = :seriesId AND r.deleted = false
                      AND (COALESCE(lk.cnt, 0) + COALESCE(rp.cnt, 0)) > 0
                    ORDER BY (
                        SIGN(COALESCE(lk.cnt, 0) + COALESCE(rp.cnt, 0) * 0.5)
                        * LOG(GREATEST(COALESCE(lk.cnt, 0) + COALESCE(rp.cnt, 0) * 0.5, 1))
                        + EXTRACT(EPOCH FROM r.created_at) / 45000.0
                    ) DESC,
                    r.created_at DESC,
                    r.id DESC
                    """,
            countQuery = """
                    SELECT COUNT(*) FROM series_reviews r
                    LEFT JOIN (
                        SELECT target_id, COUNT(*) AS cnt FROM review_likes
                        WHERE target_type = 'SERIES' GROUP BY target_id
                    ) lk ON lk.target_id = r.id
                    LEFT JOIN (
                        SELECT target_id, COUNT(*) AS cnt FROM review_replies
                        WHERE target_type = 'SERIES' AND deleted = false GROUP BY target_id
                    ) rp ON rp.target_id = r.id
                    WHERE r.series_id = :seriesId AND r.deleted = false
                      AND (COALESCE(lk.cnt, 0) + COALESCE(rp.cnt, 0)) > 0
                    """,
            nativeQuery = true
    )
    Page<Long> findPopularIdsPage(@Param("seriesId") Long seriesId, Pageable pageable);

    @Query("""
            SELECT r FROM SeriesReview r
            JOIN FETCH r.user
            WHERE r.id IN :ids AND r.deleted = false
            """)
    List<SeriesReview> findAllByIdsFetchUser(@Param("ids") Collection<Long> ids);

    /**
     * Notification hydration: includes soft-deleted rows so we can render a
     * tombstone when the underlying review has been removed.
     */
    @Query("""
            SELECT r FROM SeriesReview r
            JOIN FETCH r.series
            WHERE r.id IN :ids
            """)
    List<SeriesReview> findAllByIdsFetchSeriesIncludingDeleted(@Param("ids") Collection<Long> ids);
}
