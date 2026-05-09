package com.moviereviewhub.modules.review.dto;

import com.moviereviewhub.modules.review.domain.Review;

import java.time.Instant;

public record ReviewResponse(
        Long id,
        Double rating,
        String comment,
        Long userId,
        String username,
        Long movieId,
        String movieTitle,
        Instant createdAt,
        Instant updatedAt
) {
    public static ReviewResponse from(Review r) {
        return new ReviewResponse(
                r.getId(),
                r.getRating() / 2.0,
                r.getComment(),
                r.getUser().getId(),
                r.getUser().getUsername(),
                r.getMovie().getId(),
                r.getMovie().getTitle(),
                r.getCreatedAt(),
                r.getUpdatedAt()
        );
    }
}
