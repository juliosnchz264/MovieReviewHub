package com.moviereviewhub.modules.series.repository;

import com.moviereviewhub.modules.series.domain.Series;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SeriesRepository extends JpaRepository<Series, Long> {

    Optional<Series> findByIdAndDeletedFalse(Long id);

    Optional<Series> findByTmdbId(Long tmdbId);

    List<Series> findByTmdbIdInAndDeletedFalse(Collection<Long> tmdbIds);

    long countByDeletedFalse();

    @Query(value = """
            SELECT * FROM series s
            WHERE s.deleted = false
              AND LOWER(s.title) LIKE LOWER(CONCAT('%', :title, '%'))
              AND (:genre = '' OR :genre = ANY(s.genres))
            """,
            countQuery = """
            SELECT COUNT(*) FROM series s
            WHERE s.deleted = false
              AND LOWER(s.title) LIKE LOWER(CONCAT('%', :title, '%'))
              AND (:genre = '' OR :genre = ANY(s.genres))
            """,
            nativeQuery = true)
    Page<Series> search(@Param("title") String title,
                        @Param("genre") String genre,
                        Pageable pageable);

    @Query(value = """
            SELECT s.* FROM series s
            WHERE s.deleted = false
              AND s.id <> :seriesId
              AND s.genres && CAST(:genres AS text[])
            ORDER BY s.first_air_date DESC NULLS LAST, s.created_at DESC
            """, nativeQuery = true)
    List<Series> findSimilar(@Param("seriesId") Long seriesId,
                             @Param("genres") String[] genres,
                             Pageable pageable);

    @Query(value = """
            SELECT s.* FROM series s
            WHERE s.deleted = false
            ORDER BY (
                (SELECT COUNT(*) FROM series_reviews r
                 WHERE r.series_id = s.id AND r.deleted = false AND r.created_at > :since)
                +
                (SELECT COUNT(*) FROM series_favorites f
                 WHERE f.series_id = s.id AND f.created_at > :since) * 2
            ) DESC, s.created_at DESC
            """, nativeQuery = true)
    List<Series> findTrending(@Param("since") Instant since, Pageable pageable);

    @Query(value = """
            SELECT s.* FROM series s
            WHERE s.deleted = false
              AND (
                SELECT COUNT(*) FROM series_reviews r
                WHERE r.series_id = s.id AND r.deleted = false
              ) >= :minReviews
            ORDER BY (
                SELECT AVG(r.rating) FROM series_reviews r
                WHERE r.series_id = s.id AND r.deleted = false
            ) DESC NULLS LAST
            """, nativeQuery = true)
    List<Series> findTopRated(@Param("minReviews") int minReviews, Pageable pageable);
}
