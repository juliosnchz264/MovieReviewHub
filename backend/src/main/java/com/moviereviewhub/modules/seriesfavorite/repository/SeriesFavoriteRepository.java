package com.moviereviewhub.modules.seriesfavorite.repository;

import com.moviereviewhub.modules.series.domain.Series;
import com.moviereviewhub.modules.seriesfavorite.domain.SeriesFavorite;
import com.moviereviewhub.modules.seriesfavorite.domain.SeriesFavoriteId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface SeriesFavoriteRepository extends JpaRepository<SeriesFavorite, SeriesFavoriteId> {

    boolean existsByUserIdAndSeriesId(Long userId, Long seriesId);

    void deleteByUserIdAndSeriesId(Long userId, Long seriesId);

    @Query("""
            SELECT f.series FROM SeriesFavorite f
            WHERE f.userId = :userId AND f.series.deleted = false
            ORDER BY f.createdAt DESC
            """)
    Page<Series> findFavoriteSeries(@Param("userId") Long userId, Pageable pageable);

    @Query("""
            SELECT f.userId FROM SeriesFavorite f
            WHERE f.seriesId = :seriesId AND f.userId IN :userIds
            """)
    List<Long> findUserIdsFavoritingSeries(
            @Param("seriesId") Long seriesId,
            @Param("userIds") Collection<Long> userIds);
}
