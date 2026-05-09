package com.moviereviewhub.modules.list.repository;

import com.moviereviewhub.modules.list.domain.ListItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ListItemRepository extends JpaRepository<ListItem, Long> {

    @Query("""
            SELECT i FROM ListItem i
            LEFT JOIN FETCH i.movie m
            LEFT JOIN FETCH i.series s
            WHERE i.listId = :listId
              AND (m IS NULL OR m.deleted = false)
              AND (s IS NULL OR s.deleted = false)
            ORDER BY i.position ASC NULLS LAST, i.addedAt DESC
            """)
    Page<ListItem> findActiveByListId(@Param("listId") Long listId, Pageable pageable);

    Optional<ListItem> findByIdAndListId(Long id, Long listId);

    boolean existsByListIdAndMovieId(Long listId, Long movieId);

    boolean existsByListIdAndSeriesId(Long listId, Long seriesId);

    long countByListId(Long listId);

    void deleteByListIdAndMovieId(Long listId, Long movieId);

    void deleteByListIdAndSeriesId(Long listId, Long seriesId);

    @Query("""
            SELECT i.listId FROM ListItem i
            WHERE i.movieId = :movieId
              AND i.listId IN (
                  SELECT l.id FROM CustomList l
                  WHERE l.userId = :userId AND l.deleted = false
              )
            """)
    List<Long> findUserListIdsContainingMovie(
            @Param("userId") Long userId, @Param("movieId") Long movieId);

    @Query("""
            SELECT i.listId FROM ListItem i
            WHERE i.seriesId = :seriesId
              AND i.listId IN (
                  SELECT l.id FROM CustomList l
                  WHERE l.userId = :userId AND l.deleted = false
              )
            """)
    List<Long> findUserListIdsContainingSeries(
            @Param("userId") Long userId, @Param("seriesId") Long seriesId);
}
