package com.moviereviewhub.modules.seriesreview.repository;

import com.moviereviewhub.modules.review.dto.MovieRatingStats;
import com.moviereviewhub.modules.seriesreview.domain.SeriesReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface SeriesReviewRepository extends JpaRepository<SeriesReview, Long> {

    Optional<SeriesReview> findByIdAndDeletedFalse(Long id);

    boolean existsByUser_IdAndSeries_IdAndDeletedFalse(Long userId, Long seriesId);

    Optional<SeriesReview> findByUser_IdAndSeries_IdAndDeletedFalse(Long userId, Long seriesId);

    long countByDeletedFalse();

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
}
