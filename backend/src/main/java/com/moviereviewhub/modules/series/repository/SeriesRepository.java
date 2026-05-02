package com.moviereviewhub.modules.series.repository;

import com.moviereviewhub.modules.series.domain.Series;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SeriesRepository extends JpaRepository<Series, Long> {

    Optional<Series> findByIdAndDeletedFalse(Long id);

    Optional<Series> findByTmdbId(Long tmdbId);

    long countByDeletedFalse();

    @Query("""
            SELECT s FROM Series s
            WHERE s.deleted = false
              AND LOWER(s.title) LIKE LOWER(CONCAT('%', :title, '%'))
              AND (:genre = '' OR s.genre = :genre)
            """)
    Page<Series> search(@Param("title") String title,
                        @Param("genre") String genre,
                        Pageable pageable);

    @Query(value = """
            SELECT s.* FROM series s
            WHERE s.deleted = false
              AND s.id <> :seriesId
              AND s.genre = :genre
              AND s.genre IS NOT NULL
            ORDER BY s.first_air_date DESC NULLS LAST, s.created_at DESC
            """, nativeQuery = true)
    List<Series> findSimilar(@Param("seriesId") Long seriesId,
                             @Param("genre") String genre,
                             Pageable pageable);
}
