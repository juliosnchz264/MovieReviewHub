package com.moviereviewhub.modules.seriesfavorite.service;

import com.moviereviewhub.common.dto.PagedResponse;
import com.moviereviewhub.exception.NotFoundException;
import com.moviereviewhub.modules.series.domain.Series;
import com.moviereviewhub.modules.series.dto.SeriesResponse;
import com.moviereviewhub.modules.series.repository.SeriesRepository;
import com.moviereviewhub.modules.seriesfavorite.domain.SeriesFavorite;
import com.moviereviewhub.modules.seriesfavorite.repository.SeriesFavoriteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SeriesFavoriteService {

    private final SeriesFavoriteRepository favoriteRepository;
    private final SeriesRepository seriesRepository;

    @Transactional(readOnly = true)
    public PagedResponse<SeriesResponse> findMyFavorites(Long userId, Pageable pageable) {
        Page<Series> page = favoriteRepository.findFavoriteSeries(userId, pageable);
        return PagedResponse.from(page, SeriesResponse::from);
    }

    @Transactional(readOnly = true)
    public boolean isFavorite(Long userId, Long seriesId) {
        return favoriteRepository.existsByUserIdAndSeriesId(userId, seriesId);
    }

    @Transactional
    public void add(Long userId, Long seriesId) {
        if (favoriteRepository.existsByUserIdAndSeriesId(userId, seriesId)) {
            return;
        }
        seriesRepository.findByIdAndDeletedFalse(seriesId)
                .orElseThrow(() -> new NotFoundException("Series not found"));
        favoriteRepository.save(SeriesFavorite.builder()
                .userId(userId)
                .seriesId(seriesId)
                .build());
    }

    @Transactional
    public void remove(Long userId, Long seriesId) {
        favoriteRepository.deleteByUserIdAndSeriesId(userId, seriesId);
    }
}
