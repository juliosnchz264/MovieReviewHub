package com.moviereviewhub.modules.tmdb.service;

import com.moviereviewhub.config.properties.TmdbProperties;
import com.moviereviewhub.exception.ApiException;
import com.moviereviewhub.exception.NotFoundException;
import com.moviereviewhub.modules.movie.domain.Movie;
import com.moviereviewhub.modules.movie.dto.MovieResponse;
import com.moviereviewhub.modules.movie.repository.MovieRepository;
import com.moviereviewhub.modules.series.domain.Series;
import com.moviereviewhub.modules.series.dto.SeriesResponse;
import com.moviereviewhub.modules.series.repository.SeriesRepository;
import com.moviereviewhub.modules.tmdb.dto.AwardSyncRequest;
import com.moviereviewhub.modules.tmdb.dto.AwardSyncResult;
import com.moviereviewhub.modules.tmdb.dto.GenreRefreshResult;
import com.moviereviewhub.modules.tmdb.dto.TmdbGenre;
import com.moviereviewhub.modules.tmdb.dto.TmdbMovie;
import com.moviereviewhub.modules.tmdb.dto.TmdbMovieView;
import com.moviereviewhub.modules.tmdb.dto.TmdbSearchResponse;
import com.moviereviewhub.modules.tmdb.dto.TmdbTvSearchResponse;
import com.moviereviewhub.modules.tmdb.dto.TmdbTvShow;
import com.moviereviewhub.modules.tmdb.dto.TmdbTvView;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
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
    private final SeriesRepository seriesRepository;

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
                .genres(allGenres(details.genres()))
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
                            allGenres(m.genres()),
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

    /**
     * Backfill: re-fetch detalles TMDB de cada movie con tmdb_id y actualiza
     * el array genres. Util para rows importadas antes de soportar multi-genero.
     * Sin @Transactional global: cada save se commitea por su cuenta para que
     * un fallo aislado no rollbackee el resto.
     */
    public GenreRefreshResult refreshMovieGenres() {
        requireApiKey();
        int updated = 0, skipped = 0, failed = 0;
        List<Movie> all = movieRepository.findAll();
        for (Movie m : all) {
            if (m.getTmdbId() == null) { skipped++; continue; }
            try {
                Long tmdbId = m.getTmdbId();
                TmdbMovie details = tmdbRestClient.get()
                        .uri(uri -> uri.path("/movie/{id}")
                                .queryParam("language", "en-US")
                                .build(tmdbId))
                        .retrieve()
                        .body(TmdbMovie.class);
                if (details == null) { skipped++; continue; }
                List<String> genres = allGenres(details.genres());
                if (genres.isEmpty()) { skipped++; continue; }
                m.setGenres(genres);
                movieRepository.save(m);
                updated++;
            } catch (Exception e) {
                log.warn("Refresh genres failed for movie tmdbId={}: {}", m.getTmdbId(), e.getMessage());
                failed++;
            }
        }
        log.info("Movie genre refresh done — updated={} skipped={} failed={}", updated, skipped, failed);
        return new GenreRefreshResult(updated, skipped, failed);
    }

    /** Mismo backfill para series. */
    public GenreRefreshResult refreshSeriesGenres() {
        requireApiKey();
        int updated = 0, skipped = 0, failed = 0;
        List<Series> all = seriesRepository.findAll();
        for (Series s : all) {
            if (s.getTmdbId() == null) { skipped++; continue; }
            try {
                Long tmdbId = s.getTmdbId();
                TmdbTvShow details = tmdbRestClient.get()
                        .uri(uri -> uri.path("/tv/{id}")
                                .queryParam("language", "en-US")
                                .build(tmdbId))
                        .retrieve()
                        .body(TmdbTvShow.class);
                if (details == null) { skipped++; continue; }
                List<String> genres = allGenres(details.genres());
                if (genres.isEmpty()) { skipped++; continue; }
                s.setGenres(genres);
                seriesRepository.save(s);
                updated++;
            } catch (Exception e) {
                log.warn("Refresh genres failed for series tmdbId={}: {}", s.getTmdbId(), e.getMessage());
                failed++;
            }
        }
        log.info("Series genre refresh done — updated={} skipped={} failed={}", updated, skipped, failed);
        return new GenreRefreshResult(updated, skipped, failed);
    }

    private List<String> allGenres(List<TmdbGenre> genres) {
        if (genres == null || genres.isEmpty()) return List.of();
        return genres.stream()
                .filter(g -> g != null && g.name() != null && !g.name().isBlank())
                .map(TmdbGenre::name)
                .toList();
    }

    // ===================================================================
    // TV / Series
    // ===================================================================

    public List<TmdbTvView> searchTv(String query) {
        requireApiKey();
        TmdbTvSearchResponse res = tmdbRestClient.get()
                .uri(uri -> uri.path("/search/tv")
                        .queryParam("query", query)
                        .queryParam("include_adult", false)
                        .queryParam("language", "en-US")
                        .queryParam("page", 1)
                        .build())
                .retrieve()
                .body(TmdbTvSearchResponse.class);

        if (res == null || res.results() == null) return List.of();
        return enrichTv(res.results());
    }

    public List<TmdbTvView> popularTv() {
        requireApiKey();
        TmdbTvSearchResponse res = tmdbRestClient.get()
                .uri(uri -> uri.path("/tv/popular")
                        .queryParam("language", "en-US")
                        .queryParam("page", 1)
                        .build())
                .retrieve()
                .body(TmdbTvSearchResponse.class);

        if (res == null || res.results() == null) return List.of();
        return enrichTv(res.results());
    }

    @Transactional
    public SeriesResponse importSeries(Long tmdbId) {
        requireApiKey();

        Optional<Series> existing = seriesRepository.findByTmdbId(tmdbId);
        if (existing.isPresent()) {
            return SeriesResponse.from(existing.get());
        }

        TmdbTvShow details = tmdbRestClient.get()
                .uri(uri -> uri.path("/tv/{id}")
                        .queryParam("language", "en-US")
                        .build(tmdbId))
                .retrieve()
                .body(TmdbTvShow.class);

        if (details == null) {
            throw new NotFoundException("TMDB series not found: " + tmdbId);
        }

        Series series = Series.builder()
                .title(details.name())
                .description(details.overview())
                .genres(allGenres(details.genres()))
                .imageUrl(buildPosterUrl(details.posterPath()))
                .firstAirDate(parseDate(details.firstAirDate()))
                .lastAirDate(parseDate(details.lastAirDate()))
                .numberOfSeasons(details.numberOfSeasons())
                .numberOfEpisodes(details.numberOfEpisodes())
                .tmdbId(details.id())
                .build();

        return SeriesResponse.from(seriesRepository.save(series));
    }

    private List<TmdbTvView> enrichTv(List<TmdbTvShow> raw) {
        Set<Long> ids = new HashSet<>();
        for (TmdbTvShow s : raw) if (s.id() != null) ids.add(s.id());
        if (ids.isEmpty()) return List.of();

        Map<Long, Series> imported = seriesRepository.findAll().stream()
                .filter(s -> s.getTmdbId() != null && ids.contains(s.getTmdbId()))
                .collect(java.util.stream.Collectors.toMap(Series::getTmdbId, s -> s));

        return raw.stream()
                .map(s -> {
                    Series local = imported.get(s.id());
                    return new TmdbTvView(
                            s.id(),
                            s.name(),
                            s.overview(),
                            buildPosterUrl(s.posterPath()),
                            s.firstAirDate(),
                            s.lastAirDate(),
                            s.numberOfSeasons(),
                            s.numberOfEpisodes(),
                            allGenres(s.genres()),
                            s.voteAverage(),
                            s.voteCount(),
                            local != null,
                            local != null ? local.getId() : null
                    );
                })
                .toList();
    }

    // ===================================================================
    // Poster lookups (publicos, usados por la pagina de Awards). N requests
    // a TMDB sin batching nativo; fallar uno no aborta el resto. Las
    // entradas con 404/poster_path null simplemente se omiten del map.
    // ===================================================================

    public Map<Long, String> fetchMoviePosters(List<Long> tmdbIds) {
        return fetchPosters(tmdbIds, "/movie/{id}", TmdbMovie.class, TmdbMovie::posterPath);
    }

    public Map<Long, String> fetchTvPosters(List<Long> tmdbIds) {
        return fetchPosters(tmdbIds, "/tv/{id}", TmdbTvShow.class, TmdbTvShow::posterPath);
    }

    private <T> Map<Long, String> fetchPosters(List<Long> tmdbIds,
                                               String pathTemplate,
                                               Class<T> bodyType,
                                               java.util.function.Function<T, String> extractPosterPath) {
        if (tmdbIds == null || tmdbIds.isEmpty()) return Map.of();
        requireApiKey();
        Map<Long, String> out = new java.util.LinkedHashMap<>();
        for (Long id : tmdbIds) {
            if (id == null) continue;
            try {
                T body = tmdbRestClient.get()
                        .uri(uri -> uri.path(pathTemplate)
                                .queryParam("language", "en-US")
                                .build(id))
                        .retrieve()
                        .body(bodyType);
                if (body == null) continue;
                String url = buildPosterUrl(extractPosterPath.apply(body));
                if (url != null) out.put(id, url);
            } catch (Exception e) {
                // 404 / network glitch / lo que sea -> omitir, no abortar el batch
                log.debug("TMDB poster fetch failed for id={} ({}): {}", id, pathTemplate, e.getMessage());
            }
        }
        return out;
    }

    // ===================================================================
    // Awards bulk import
    // ===================================================================

    /**
     * Importa todos los items que aun no esten en el catalogo y devuelve el
     * mapping completo tmdbId -> catalogId. Sin @Transactional global: cada
     * import gestiona su propia tx via @Transactional en importMovie/importSeries.
     * Fallos aislados se acumulan en el resultado en vez de abortar el batch.
     */
    public AwardSyncResult syncAwards(List<AwardSyncRequest.AwardSyncItem> items) {
        int importedMovies = 0, importedSeries = 0;
        int skippedMovies = 0, skippedSeries = 0;
        List<AwardSyncResult.Failure> failures = new ArrayList<>();
        Map<Long, Long> movieMapping = new HashMap<>();
        Map<Long, Long> seriesMapping = new HashMap<>();

        for (AwardSyncRequest.AwardSyncItem item : items) {
            try {
                if ("movie".equals(item.mediaType())) {
                    Optional<Movie> existing = movieRepository.findByTmdbId(item.tmdbId());
                    if (existing.isPresent()) {
                        skippedMovies++;
                        movieMapping.put(item.tmdbId(), existing.get().getId());
                    } else {
                        MovieResponse imported = importMovie(item.tmdbId());
                        importedMovies++;
                        movieMapping.put(item.tmdbId(), imported.id());
                    }
                } else {
                    Optional<Series> existing = seriesRepository.findByTmdbId(item.tmdbId());
                    if (existing.isPresent()) {
                        skippedSeries++;
                        seriesMapping.put(item.tmdbId(), existing.get().getId());
                    } else {
                        SeriesResponse imported = importSeries(item.tmdbId());
                        importedSeries++;
                        seriesMapping.put(item.tmdbId(), imported.id());
                    }
                }
            } catch (Exception e) {
                log.warn("Award sync failed for tmdbId={} mediaType={}: {}",
                        item.tmdbId(), item.mediaType(), e.getMessage());
                failures.add(new AwardSyncResult.Failure(
                        item.tmdbId(), item.mediaType(), e.getMessage()));
            }
        }

        log.info("Awards sync done — imported movies={}, series={}; skipped movies={}, series={}; failed={}",
                importedMovies, importedSeries, skippedMovies, skippedSeries, failures.size());

        return new AwardSyncResult(
                new AwardSyncResult.Counts(importedMovies, importedSeries),
                new AwardSyncResult.Counts(skippedMovies, skippedSeries),
                failures,
                new AwardSyncResult.Mapping(movieMapping, seriesMapping)
        );
    }
}
