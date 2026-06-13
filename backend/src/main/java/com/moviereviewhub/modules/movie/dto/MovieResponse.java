package com.moviereviewhub.modules.movie.dto;

import com.moviereviewhub.modules.movie.domain.Movie;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record MovieResponse(
        Long id,
        String slug,
        String publicId,
        String title,
        String description,
        List<String> genres,
        String imageUrl,
        String backdropUrl,
        LocalDate releaseDate,
        Instant createdAt,
        Instant updatedAt
) {
    public static MovieResponse from(Movie m) {
        return new MovieResponse(
                m.getId(),
                m.getSlug(),
                m.getPublicId(),
                m.getTitle(),
                m.getDescription(),
                m.getGenres(),
                m.getImageUrl(),
                m.getBackdropUrl(),
                m.getReleaseDate(),
                m.getCreatedAt(),
                m.getUpdatedAt()
        );
    }
}
