package com.moviereviewhub.modules.review.dto;

public record MovieRatingStats(
        Double average,
        Long count
) {
    public static MovieRatingStats empty() {
        return new MovieRatingStats(0.0, 0L);
    }
}
