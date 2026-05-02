package com.moviereviewhub.modules.movie.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record MovieRequest(

        @NotBlank
        @Size(max = 255)
        String title,

        String description,

        @Size(max = 50)
        String genre,

        @Size(max = 2048)
        String imageUrl,

        LocalDate releaseDate
) {
}
