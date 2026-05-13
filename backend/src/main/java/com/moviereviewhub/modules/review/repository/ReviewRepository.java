package com.moviereviewhub.modules.review.repository;

import com.moviereviewhub.modules.review.domain.Review;
import com.moviereviewhub.modules.review.dto.MovieRatingStats;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    Optional<Review> findByIdAndDeletedFalse(Long id);

    boolean existsByUser_IdAndMovie_IdAndDeletedFalse(Long userId, Long movieId);

    Optional<Review> findByUser_IdAndMovie_IdAndDeletedFalse(Long userId, Long movieId);

    long countByDeletedFalse();

    long countByUser_IdAndDeletedFalse(Long userId);

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
}
