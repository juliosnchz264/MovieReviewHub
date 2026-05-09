package com.moviereviewhub.modules.seriesreview.dto;

import com.moviereviewhub.modules.seriesreview.domain.SeriesReview;

import java.time.Instant;

public record SeriesReviewResponse(
        Long id,
        Double rating,
        String comment,
        Long userId,
        String username,
        Long seriesId,
        String seriesTitle,
        Instant createdAt,
        Instant updatedAt
) {
    public static SeriesReviewResponse from(SeriesReview r) {
        return new SeriesReviewResponse(
                r.getId(),
                r.getRating() / 2.0,
                r.getComment(),
                r.getUser().getId(),
                r.getUser().getUsername(),
                r.getSeries().getId(),
                r.getSeries().getTitle(),
                r.getCreatedAt(),
                r.getUpdatedAt()
        );
    }
}
