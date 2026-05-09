package com.moviereviewhub.modules.review.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReviewRequest(

        @NotNull
        @DecimalMin("0.5")
        @DecimalMax("5.0")
        Double rating,

        @Size(max = 4000)
        String comment
) {
    @AssertTrue(message = "rating must be a multiple of 0.5")
    public boolean isHalfStep() {
        if (rating == null) return true;
        double doubled = rating * 2.0;
        return doubled == Math.floor(doubled);
    }
}
