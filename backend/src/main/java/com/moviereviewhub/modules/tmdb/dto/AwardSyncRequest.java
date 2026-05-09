package com.moviereviewhub.modules.tmdb.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.util.List;

public record AwardSyncRequest(
        @NotEmpty @Valid List<AwardSyncItem> items
) {
    public record AwardSyncItem(
            @NotNull Long tmdbId,
            @NotNull @Pattern(regexp = "movie|tv") String mediaType
    ) {}
}
