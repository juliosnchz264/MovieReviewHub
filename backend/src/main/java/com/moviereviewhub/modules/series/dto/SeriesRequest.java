package com.moviereviewhub.modules.series.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record SeriesRequest(

        @NotBlank
        @Size(max = 255)
        String title,

        String description,

        @Size(max = 50)
        String genre,

        @Size(max = 2048)
        String imageUrl,

        LocalDate firstAirDate,

        LocalDate lastAirDate,

        @Min(0)
        Integer numberOfSeasons,

        @Min(0)
        Integer numberOfEpisodes
) {
}
