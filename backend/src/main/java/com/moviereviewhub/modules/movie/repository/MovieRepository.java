package com.moviereviewhub.modules.movie.repository;

import com.moviereviewhub.modules.movie.domain.Movie;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface MovieRepository extends JpaRepository<Movie, Long> {

    Optional<Movie> findByIdAndDeletedFalse(Long id);

    Optional<Movie> findByTmdbId(Long tmdbId);

    long countByDeletedFalse();

    @Query("""
            SELECT m FROM Movie m
            WHERE m.deleted = false
              AND LOWER(m.title) LIKE LOWER(CONCAT('%', :title, '%'))
              AND (:genre = '' OR m.genre = :genre)
            """)
    Page<Movie> search(@Param("title") String title,
                       @Param("genre") String genre,
                       Pageable pageable);

    /**
     * Trending: score = reviews_recientes + favoritos_recientes * 2 (favs pesan mas).
     * Solo cuenta actividad desde :since (typically NOW - 30 days).
     */
    @Query(value = """
            SELECT m.* FROM movies m
            WHERE m.deleted = false
            ORDER BY (
                (SELECT COUNT(*) FROM reviews r
                 WHERE r.movie_id = m.id AND r.deleted = false AND r.created_at > :since)
                +
                (SELECT COUNT(*) FROM favorites f
                 WHERE f.movie_id = m.id AND f.created_at > :since) * 2
            ) DESC, m.created_at DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<Movie> findTrending(@Param("since") Instant since, @Param("limit") int limit);

    /**
     * Top rated: avg rating DESC, requiere minimo :minReviews para evitar
     * peliculas con 1 review 5* dominando el ranking.
     */
    @Query(value = """
            SELECT m.* FROM movies m
            WHERE m.deleted = false
              AND (
                SELECT COUNT(*) FROM reviews r
                WHERE r.movie_id = m.id AND r.deleted = false
              ) >= :minReviews
            ORDER BY (
                SELECT AVG(r.rating) FROM reviews r
                WHERE r.movie_id = m.id AND r.deleted = false
            ) DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<Movie> findTopRated(@Param("minReviews") int minReviews, @Param("limit") int limit);

    /**
     * Similar: mismo genero, exclude actual, ordenado por avg rating
     * (con penalty para 0 reviews via COALESCE).
     */
    @Query(value = """
            SELECT m.* FROM movies m
            WHERE m.deleted = false
              AND m.id <> :movieId
              AND m.genre = :genre
              AND m.genre IS NOT NULL
            ORDER BY COALESCE((
                SELECT AVG(r.rating) FROM reviews r
                WHERE r.movie_id = m.id AND r.deleted = false
            ), 0) DESC, m.created_at DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<Movie> findSimilar(@Param("movieId") Long movieId,
                            @Param("genre") String genre,
                            @Param("limit") int limit);
}
