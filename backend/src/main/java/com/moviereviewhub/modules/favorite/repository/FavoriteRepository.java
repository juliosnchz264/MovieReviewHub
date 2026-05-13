package com.moviereviewhub.modules.favorite.repository;

import com.moviereviewhub.modules.favorite.domain.Favorite;
import com.moviereviewhub.modules.favorite.domain.FavoriteId;
import com.moviereviewhub.modules.movie.domain.Movie;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface FavoriteRepository extends JpaRepository<Favorite, FavoriteId> {

    boolean existsByUserIdAndMovieId(Long userId, Long movieId);

    void deleteByUserIdAndMovieId(Long userId, Long movieId);

    long countByUserId(Long userId);

    @Query("""
            SELECT f.movie FROM Favorite f
            WHERE f.userId = :userId AND f.movie.deleted = false
            ORDER BY f.createdAt DESC
            """)
    Page<Movie> findFavoriteMovies(@Param("userId") Long userId, Pageable pageable);

    @Query("""
            SELECT f.userId FROM Favorite f
            WHERE f.movieId = :movieId AND f.userId IN :userIds
            """)
    List<Long> findUserIdsFavoritingMovie(
            @Param("movieId") Long movieId,
            @Param("userIds") Collection<Long> userIds);
}
