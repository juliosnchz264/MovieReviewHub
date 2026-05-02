package com.moviereviewhub.modules.movie.dto;

import com.moviereviewhub.modules.movie.domain.Movie;

import java.time.Instant;
import java.time.LocalDate;

public record MovieResponse(
        Long id,
        String title,
        String description,
        String genre,
        String imageUrl,
        LocalDate releaseDate,
        Instant createdAt,
        Instant updatedAt
) {
    public static MovieResponse from(Movie m) {
        return new MovieResponse(
                m.getId(),
                m.getTitle(),
                m.getDescription(),
                m.getGenre(),
                m.getImageUrl(),
                m.getReleaseDate(),
                m.getCreatedAt(),
                m.getUpdatedAt()
        );
    }
}
