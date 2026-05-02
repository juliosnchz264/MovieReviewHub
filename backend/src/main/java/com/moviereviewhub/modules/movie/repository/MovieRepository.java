package com.moviereviewhub.modules.movie.repository;

import com.moviereviewhub.modules.movie.domain.Movie;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface MovieRepository extends JpaRepository<Movie, Long> {

    Optional<Movie> findByIdAndDeletedFalse(Long id);

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
}
