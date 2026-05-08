package com.moviereviewhub.modules.movie.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record MovieRequest(

        @NotBlank
        @Size(max = 255)
        String title,

        String description,

        List<String> genres,

        @Size(max = 2048)
        String imageUrl,

        LocalDate releaseDate
) {
}
