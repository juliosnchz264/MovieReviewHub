package com.moviereviewhub.modules.series.dto;

import com.moviereviewhub.modules.series.domain.Series;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record SeriesResponse(
        Long id,
        String slug,
        String publicId,
        String title,
        String description,
        List<String> genres,
        String imageUrl,
        String backdropUrl,
        LocalDate firstAirDate,
        LocalDate lastAirDate,
        Integer numberOfSeasons,
        Integer numberOfEpisodes,
        Instant createdAt,
        Instant updatedAt
) {
    public static SeriesResponse from(Series s) {
        return new SeriesResponse(
                s.getId(),
                s.getSlug(),
                s.getPublicId(),
                s.getTitle(),
                s.getDescription(),
                s.getGenres(),
                s.getImageUrl(),
                s.getBackdropUrl(),
                s.getFirstAirDate(),
                s.getLastAirDate(),
                s.getNumberOfSeasons(),
                s.getNumberOfEpisodes(),
                s.getCreatedAt(),
                s.getUpdatedAt()
        );
    }
}
