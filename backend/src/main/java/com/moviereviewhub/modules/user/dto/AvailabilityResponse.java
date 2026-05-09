package com.moviereviewhub.modules.user.dto;

public record AvailabilityResponse(boolean available) {
    public static AvailabilityResponse of(boolean available) {
        return new AvailabilityResponse(available);
    }
}
