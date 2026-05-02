package com.moviereviewhub.modules.series.dto;

import com.moviereviewhub.modules.series.domain.Series;

import java.time.Instant;
import java.time.LocalDate;

public record SeriesResponse(
        Long id,
        String title,
        String description,
        String genre,
        String imageUrl,
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
                s.getTitle(),
                s.getDescription(),
                s.getGenre(),
                s.getImageUrl(),
                s.getFirstAirDate(),
                s.getLastAirDate(),
                s.getNumberOfSeasons(),
                s.getNumberOfEpisodes(),
                s.getCreatedAt(),
                s.getUpdatedAt()
        );
    }
}
