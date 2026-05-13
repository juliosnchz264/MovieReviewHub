package com.moviereviewhub.modules.review.repository;

import com.moviereviewhub.modules.review.domain.Review;
import com.moviereviewhub.modules.review.dto.MovieRatingStats;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    Optional<Review> findByIdAndDeletedFalse(Long id);

    boolean existsByUser_IdAndMovie_IdAndDeletedFalse(Long userId, Long movieId);

    Optional<Review> findByUser_IdAndMovie_IdAndDeletedFalse(Long userId, Long movieId);

    long countByDeletedFalse();

    long countByUser_IdAndDeletedFalse(Long userId);

    @Query("""
            SELECT r.user.id FROM Review r
            WHERE r.id = :id AND r.deleted = false
            """)
    Optional<Long> findOwnerIdById(@Param("id") Long id);

    @Query("""
            SELECT r FROM Review r
            JOIN FETCH r.user
            JOIN FETCH r.movie
            WHERE r.deleted = false
            """)
    Page<Review> findAllActive(Pageable pageable);

    @Query("""
            SELECT r FROM Review r
            JOIN FETCH r.user
            WHERE r.movie.id = :movieId AND r.deleted = false
            ORDER BY r.createdAt DESC, r.id DESC
            """)
    Page<Review> findByMovieId(@Param("movieId") Long movieId, Pageable pageable);

    @Query("""
            SELECT r FROM Review r
            JOIN FETCH r.movie
            WHERE r.user.id = :userId AND r.deleted = false
            ORDER BY r.createdAt DESC, r.id DESC
            """)
    Page<Review> findByUserId(@Param("userId") Long userId, Pageable pageable);

    @Query("""
            SELECT new com.moviereviewhub.modules.review.dto.MovieRatingStats(
                COALESCE(AVG(CAST(r.rating AS double)) / 2.0, 0.0),
                COUNT(r))
            FROM Review r
            WHERE r.movie.id = :movieId AND r.deleted = false
            """)
    MovieRatingStats getRatingStats(@Param("movieId") Long movieId);

    @Query("""
            SELECT new com.moviereviewhub.modules.review.dto.MovieRatingStats(
                COALESCE(AVG(CAST(r.rating AS double)) / 2.0, 0.0),
                COUNT(r))
            FROM Review r
            WHERE r.user.id = :userId AND r.deleted = false
            """)
    MovieRatingStats getUserRatingStats(@Param("userId") Long userId);

    /**
     * Hot-rank review ids for a movie. Letterboxd-style: weighted likes + replies
     * with time decay so recent quality bubbles up but old gold still ranks.
     * Score = (likes*2 + replies) / pow(hours_since_post + 2, 1.5).
     * Returns ids only; entities loaded separately to keep JOIN FETCH semantics.
     */
    @Query(value = """
            SELECT r.id FROM reviews r
            LEFT JOIN (
                SELECT target_id, COUNT(*) AS cnt FROM review_likes
                WHERE target_type = 'MOVIE' GROUP BY target_id
            ) lk ON lk.target_id = r.id
            LEFT JOIN (
                SELECT target_id, COUNT(*) AS cnt FROM review_replies
                WHERE target_type = 'MOVIE' AND deleted = false GROUP BY target_id
            ) rp ON rp.target_id = r.id
            WHERE r.movie_id = :movieId AND r.deleted = false
            ORDER BY (
                (COALESCE(lk.cnt, 0) * 2 + COALESCE(rp.cnt, 0))
                / POWER(EXTRACT(EPOCH FROM (now() - r.created_at)) / 3600 + 2, 1.5)
            ) DESC,
            r.created_at DESC,
            r.id DESC
            LIMIT :lim
            """, nativeQuery = true)
    List<Long> findPopularIds(@Param("movieId") Long movieId, @Param("lim") int limit);

    @Query(
            value = """
                    SELECT r.id FROM reviews r
                    LEFT JOIN (
                        SELECT target_id, COUNT(*) AS cnt FROM review_likes
                        WHERE target_type = 'MOVIE' GROUP BY target_id
                    ) lk ON lk.target_id = r.id
                    LEFT JOIN (
                        SELECT target_id, COUNT(*) AS cnt FROM review_replies
                        WHERE target_type = 'MOVIE' AND deleted = false GROUP BY target_id
                    ) rp ON rp.target_id = r.id
                    WHERE r.movie_id = :movieId AND r.deleted = false
                    ORDER BY (
                        (COALESCE(lk.cnt, 0) * 2 + COALESCE(rp.cnt, 0))
                        / POWER(EXTRACT(EPOCH FROM (now() - r.created_at)) / 3600 + 2, 1.5)
                    ) DESC,
                    r.created_at DESC,
                    r.id DESC
                    """,
            countQuery = """
                    SELECT COUNT(*) FROM reviews r
                    WHERE r.movie_id = :movieId AND r.deleted = false
                    """,
            nativeQuery = true
    )
    Page<Long> findPopularIdsPage(@Param("movieId") Long movieId, Pageable pageable);

    @Query("""
            SELECT r FROM Review r
            JOIN FETCH r.user
            WHERE r.id IN :ids AND r.deleted = false
            """)
    List<Review> findAllByIdsFetchUser(@Param("ids") Collection<Long> ids);
}
