package com.moviereviewhub.modules.movie.repository;

import com.moviereviewhub.modules.movie.domain.Movie;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface MovieRepository extends JpaRepository<Movie, Long> {

    Optional<Movie> findByIdAndDeletedFalse(Long id);

    Optional<Movie> findByTmdbId(Long tmdbId);

    List<Movie> findByTmdbIdInAndDeletedFalse(Collection<Long> tmdbIds);

    long countByDeletedFalse();

    /**
     * Busqueda por titulo + filtro opcional por un genero (debe estar en el array).
     * Native para usar = ANY(genres) sobre text[].
     */
    @Query(value = """
            SELECT * FROM movies m
            WHERE m.deleted = false
              AND LOWER(m.title) LIKE LOWER(CONCAT('%', :title, '%'))
              AND (:genre = '' OR :genre = ANY(m.genres))
            """,
            countQuery = """
            SELECT COUNT(*) FROM movies m
            WHERE m.deleted = false
              AND LOWER(m.title) LIKE LOWER(CONCAT('%', :title, '%'))
              AND (:genre = '' OR :genre = ANY(m.genres))
            """,
            nativeQuery = true)
    Page<Movie> search(@Param("title") String title,
                       @Param("genre") String genre,
                       Pageable pageable);

    /**
     * Trending: score = reviews_recientes + favoritos_recientes * 2 (favs pesan mas).
     * Limita via Pageable (Spring traduce a LIMIT/OFFSET).
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
            """, nativeQuery = true)
    List<Movie> findTrending(@Param("since") Instant since, Pageable pageable);

    /**
     * Top rated: avg rating DESC, requiere minimo :minReviews.
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
            ) DESC NULLS LAST
            """, nativeQuery = true)
    List<Movie> findTopRated(@Param("minReviews") int minReviews, Pageable pageable);

    /**
     * Similar: comparte al menos un genero (overlap &&), excluye actual.
     * Ordena por avg rating, luego created_at.
     */
    @Query(value = """
            SELECT m.* FROM movies m
            WHERE m.deleted = false
              AND m.id <> :movieId
              AND m.genres && CAST(:genres AS text[])
            ORDER BY COALESCE((
                SELECT AVG(r.rating) FROM reviews r
                WHERE r.movie_id = m.id AND r.deleted = false
            ), 0) DESC, m.created_at DESC
            """, nativeQuery = true)
    List<Movie> findSimilar(@Param("movieId") Long movieId,
                            @Param("genres") String[] genres,
                            Pageable pageable);
}
