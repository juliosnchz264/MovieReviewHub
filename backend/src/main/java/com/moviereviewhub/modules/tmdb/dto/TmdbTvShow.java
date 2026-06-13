package com.moviereviewhub.modules.tmdb.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TmdbTvShow(
        Long id,
        String name,
        String overview,

        @JsonProperty("poster_path")
        String posterPath,

        @JsonProperty("backdrop_path")
        String backdropPath,

        @JsonProperty("first_air_date")
        String firstAirDate,

        @JsonProperty("last_air_date")
        String lastAirDate,

        @JsonProperty("number_of_seasons")
        Integer numberOfSeasons,

        @JsonProperty("number_of_episodes")
        Integer numberOfEpisodes,

        @JsonProperty("genre_ids")
        List<Integer> genreIds,

        List<TmdbGenre> genres,

        @JsonProperty("vote_average")
        Double voteAverage,

        @JsonProperty("vote_count")
        Integer voteCount
) {
}
