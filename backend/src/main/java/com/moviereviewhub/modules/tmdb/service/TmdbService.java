package com.moviereviewhub.modules.tmdb.service;

import com.moviereviewhub.config.properties.TmdbProperties;
import com.moviereviewhub.exception.ApiException;
import com.moviereviewhub.exception.NotFoundException;
import com.moviereviewhub.modules.movie.domain.Movie;
import com.moviereviewhub.modules.movie.dto.MovieResponse;
import com.moviereviewhub.modules.movie.repository.MovieRepository;
import com.moviereviewhub.modules.tmdb.dto.TmdbMovie;
import com.moviereviewhub.modules.tmdb.dto.TmdbMovieView;
import com.moviereviewhub.modules.tmdb.dto.TmdbSearchResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class TmdbService {

    private final RestClient tmdbRestClient;
    private final TmdbProperties tmdbProperties;
    private final MovieRepository movieRepository;

    private void requireApiKey() {
        if (tmdbProperties.apiKey() == null || tmdbProperties.apiKey().isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "TMDB integration not configured (TMDB_API_KEY missing)");
        }
    }

    public List<TmdbMovieView> search(String query) {
        requireApiKey();
        TmdbSearchResponse res = tmdbRestClient.get()
                .uri(uri -> uri.path("/search/movie")
                        .queryParam("query", query)
                        .queryParam("include_adult", false)
                        .queryParam("language", "en-US")
                        .queryParam("page", 1)
                        .build())
                .retrieve()
                .body(TmdbSearchResponse.class);

        if (res == null || res.results() == null) return List.of();
        return enrich(res.results());
    }

    public List<TmdbMovieView> popular() {
        requireApiKey();
        TmdbSearchResponse res = tmdbRestClient.get()
                .uri(uri -> uri.path("/movie/popular")
                        .queryParam("language", "en-US")
                        .queryParam("page", 1)
                        .build())
                .retrieve()
                .body(TmdbSearchResponse.class);

        if (res == null || res.results() == null) return List.of();
        return enrich(res.results());
    }

    @Transactional
    public MovieResponse importMovie(Long tmdbId) {
        requireApiKey();

        Optional<Movie> existing = movieRepository.findByTmdbId(tmdbId);
        if (existing.isPresent()) {
            return MovieResponse.from(existing.get());
        }

        TmdbMovie details = tmdbRestClient.get()
                .uri(uri -> uri.path("/movie/{id}")
                        .queryParam("language", "en-US")
                        .build(tmdbId))
                .retrieve()
                .body(TmdbMovie.class);

        if (details == null) {
            throw new NotFoundException("TMDB movie not found: " + tmdbId);
        }

        Movie movie = Movie.builder()
                .title(details.title())
                .description(details.overview())
                .genre(firstGenre(details))
                .imageUrl(buildPosterUrl(details.posterPath()))
                .releaseDate(parseDate(details.releaseDate()))
                .tmdbId(details.id())
                .build();

        return MovieResponse.from(movieRepository.save(movie));
    }

    private List<TmdbMovieView> enrich(List<TmdbMovie> raw) {
        Set<Long> ids = new HashSet<>();
        for (TmdbMovie m : raw) if (m.id() != null) ids.add(m.id());
        if (ids.isEmpty()) return List.of();

        Map<Long, Movie> imported = movieRepository.findAll().stream()
                .filter(m -> m.getTmdbId() != null && ids.contains(m.getTmdbId()))
                .collect(java.util.stream.Collectors.toMap(Movie::getTmdbId, m -> m));

        return raw.stream()
                .map(m -> {
                    Movie local = imported.get(m.id());
                    return new TmdbMovieView(
                            m.id(),
                            m.title(),
                            m.overview(),
                            buildPosterUrl(m.posterPath()),
                            m.releaseDate(),
                            firstGenre(m),
                            m.voteAverage(),
                            m.voteCount(),
                            local != null,
                            local != null ? local.getId() : null
                    );
                })
                .toList();
    }

    private String buildPosterUrl(String posterPath) {
        if (posterPath == null || posterPath.isBlank()) return null;
        return tmdbProperties.imageBaseUrl() + "/" + tmdbProperties.posterSize() + posterPath;
    }

    private LocalDate parseDate(String iso) {
        if (iso == null || iso.isBlank()) return null;
        try {
            return LocalDate.parse(iso);
        } catch (Exception e) {
            log.warn("Cannot parse TMDB date '{}'", iso);
            return null;
        }
    }

    private String firstGenre(TmdbMovie m) {
        if (m.genres() != null && !m.genres().isEmpty()) {
            return m.genres().get(0).name();
        }
        return null;
    }
}
