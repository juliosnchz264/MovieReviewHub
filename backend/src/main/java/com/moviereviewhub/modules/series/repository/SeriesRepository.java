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

    /**
     * Similar: comparte al menos un genero, excluye actual.
     * Ordena por rating_avg denormalizado y first_air_date.
     */
    @Query(value = """
            SELECT s.* FROM series s
            WHERE s.deleted = false
              AND s.id <> :seriesId
              AND s.genres && CAST(:genres AS text[])
            ORDER BY COALESCE(s.rating_avg, 0) DESC, s.first_air_date DESC NULLS LAST, s.created_at DESC
            """, nativeQuery = true)
    List<Series> findSimilar(@Param("seriesId") Long seriesId,
                             @Param("genres") String[] genres,
                             Pageable pageable);

    /**
     * Trending: lee del materialized view series_trending_stats (V20).
     * Ver MovieRepository.findTrending para detalles del flujo de refresco.
     */
    @Query(value = """
            SELECT s.* FROM series s
            JOIN series_trending_stats t ON t.series_id = s.id
            WHERE s.deleted = false
              AND t.score > 0
            ORDER BY t.score DESC, s.id DESC
            """, nativeQuery = true)
    List<Series> findTrending(@Param("since") Instant since, Pageable pageable);

    /**
     * Top rated: usa columna denormalizada series.rating_avg (V20).
     */
    @Query(value = """
            SELECT s.* FROM series s
            WHERE s.deleted = false
              AND s.review_count >= :minReviews
            ORDER BY s.rating_avg DESC NULLS LAST, s.review_count DESC
            """, nativeQuery = true)
    List<Series> findTopRated(@Param("minReviews") int minReviews, Pageable pageable);
}
