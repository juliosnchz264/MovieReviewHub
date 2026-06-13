package com.moviereviewhub.modules.tmdb.service;

import com.moviereviewhub.config.CacheConfig;
import com.moviereviewhub.config.properties.TmdbProperties;
import com.moviereviewhub.exception.ApiException;
import com.moviereviewhub.exception.NotFoundException;
import com.moviereviewhub.modules.movie.domain.Movie;
import com.moviereviewhub.modules.movie.dto.MovieResponse;
import com.moviereviewhub.modules.movie.repository.MovieRepository;
import com.moviereviewhub.modules.people.dto.CastMemberResponse;
import com.moviereviewhub.modules.people.dto.TmdbCastEntry;
import com.moviereviewhub.modules.people.dto.TmdbMovieCredits;
import com.moviereviewhub.modules.series.domain.Series;
import com.moviereviewhub.modules.series.dto.SeriesResponse;
import com.moviereviewhub.modules.series.repository.SeriesRepository;
import com.moviereviewhub.modules.tmdb.dto.AutoLinkResult;
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
import com.moviereviewhub.modules.tmdb.dto.TmdbVideoEntry;
import com.moviereviewhub.modules.tmdb.dto.TmdbVideosResponse;
import com.moviereviewhub.modules.tmdb.dto.TrailerResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class TmdbService {

    private final RestClient tmdbRestClient;
    private final TmdbProperties tmdbProperties;
    private final MovieRepository movieRepository;
    private final SeriesRepository seriesRepository;
    private final com.moviereviewhub.common.slug.PublicIdentifierFactory publicIdentifierFactory;

    /**
     * Lazy self-lookup so calls inside syncAwards() to importMovie / importSeries
     * traverse the AOP proxy and the @Transactional annotation actually applies.
     * Using ObjectProvider avoids the constructor-time circular reference that
     * a plain @Lazy final field would introduce with Lombok's generated ctor.
     */
    private final ObjectProvider<TmdbService> selfProvider;

    private TmdbService self() {
        return selfProvider.getObject();
    }

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
                .backdropUrl(buildBackdropUrl(details.backdropPath()))
                .releaseDate(parseDate(details.releaseDate()))
                .tmdbId(details.id())
                .slug(publicIdentifierFactory.uniqueSlug(details.title(), movieRepository::existsBySlug))
                .publicId(publicIdentifierFactory.uniquePublicId(movieRepository::existsByPublicId))
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
                            buildBackdropUrl(m.backdropPath()),
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

    /**
     * Backdrop renders behind the hero on detail pages. Fixed at w1280 — wide
     * enough for retina desktops, small enough that mobile waste stays bounded.
     */
    private String buildBackdropUrl(String backdropPath) {
        if (backdropPath == null || backdropPath.isBlank()) return null;
        return tmdbProperties.imageBaseUrl() + "/w1280" + backdropPath;
    }

    /**
     * Profile image for cast cards. h632 matches the 2:3 portrait aspect we
     * use elsewhere; null falls through to a placeholder client-side.
     */
    private String buildProfileUrl(String profilePath) {
        if (profilePath == null || profilePath.isBlank()) return null;
        return tmdbProperties.imageBaseUrl() + "/h632" + profilePath;
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
                .backdropUrl(buildBackdropUrl(details.backdropPath()))
                .firstAirDate(parseDate(details.firstAirDate()))
                .lastAirDate(parseDate(details.lastAirDate()))
                .numberOfSeasons(details.numberOfSeasons())
                .numberOfEpisodes(details.numberOfEpisodes())
                .tmdbId(details.id())
                .slug(publicIdentifierFactory.uniqueSlug(details.name(), seriesRepository::existsBySlug))
                .publicId(publicIdentifierFactory.uniquePublicId(seriesRepository::existsByPublicId))
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
                            buildBackdropUrl(s.backdropPath()),
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
     * import gestiona su propia tx via @Transactional en importMovie/importSeries
     * llamados a traves del proxy (self) para que la anotacion se aplique.
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
                        MovieResponse imported = self().importMovie(item.tmdbId());
                        importedMovies++;
                        movieMapping.put(item.tmdbId(), imported.id());
                    }
                } else {
                    Optional<Series> existing = seriesRepository.findByTmdbId(item.tmdbId());
                    if (existing.isPresent()) {
                        skippedSeries++;
                        seriesMapping.put(item.tmdbId(), existing.get().getId());
                    } else {
                        SeriesResponse imported = self().importSeries(item.tmdbId());
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

    // ===================================================================
    // Cast (TMDB credits)
    // ===================================================================

    /** Cap surfaced by every controller; clamps adversarial limit values. */
    public static final int MAX_CAST_LIMIT = 30;

    /**
     * Top-billed cast for a locally-imported movie. Local id is resolved to
     * the TMDB id server-side so the client cannot probe arbitrary TMDB
     * persons via this route. Limit is clamped.
     */
    @Cacheable(cacheNames = CacheConfig.TMDB_CAST,
            key = "'movie:' + #localMovieId + ':' + #limit")
    public List<CastMemberResponse> fetchMovieCast(Long localMovieId, int limit) {
        requireApiKey();
        Movie movie = movieRepository.findById(localMovieId)
                .orElseThrow(() -> new NotFoundException("Movie not found"));
        if (movie.getTmdbId() == null) return List.of();
        return fetchCastByTmdb("/movie/{id}/credits", movie.getTmdbId(), limit);
    }

    @Cacheable(cacheNames = CacheConfig.TMDB_CAST,
            key = "'series:' + #localSeriesId + ':' + #limit")
    public List<CastMemberResponse> fetchSeriesCast(Long localSeriesId, int limit) {
        requireApiKey();
        Series series = seriesRepository.findById(localSeriesId)
                .orElseThrow(() -> new NotFoundException("Series not found"));
        if (series.getTmdbId() == null) return List.of();
        return fetchCastByTmdb("/tv/{id}/credits", series.getTmdbId(), limit);
    }

    private List<CastMemberResponse> fetchCastByTmdb(String pathTemplate, Long tmdbId, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, MAX_CAST_LIMIT));
        try {
            TmdbMovieCredits credits = tmdbRestClient.get()
                    .uri(uri -> uri.path(pathTemplate)
                            .queryParam("language", "en-US")
                            .build(tmdbId))
                    .retrieve()
                    .body(TmdbMovieCredits.class);
            if (credits == null || credits.cast() == null) return List.of();
            return credits.cast().stream()
                    .filter(c -> c != null && c.id() != null && c.name() != null)
                    .sorted(Comparator.comparing(
                            (TmdbCastEntry c) -> c.order() == null ? Integer.MAX_VALUE : c.order()))
                    .limit(safeLimit)
                    .map(c -> new CastMemberResponse(
                            c.id(),
                            c.name(),
                            c.character() == null ? "" : c.character(),
                            buildProfileUrl(c.profilePath()),
                            c.order()
                    ))
                    .toList();
        } catch (Exception e) {
            log.warn("TMDB cast fetch failed for {} tmdbId={}: {}",
                    pathTemplate, tmdbId, e.getMessage());
            return List.of();
        }
    }

    // ===================================================================
    // Trailer (TMDB videos)
    // ===================================================================

    /**
     * YouTube ids are 11 chars in modern uploads but a few legacy ones run
     * 6-16. The range below covers everything TMDB returns while still
     * rejecting unbounded strings.
     */
    private static final Pattern YOUTUBE_KEY = Pattern.compile("^[A-Za-z0-9_-]{6,16}$");

    @Cacheable(cacheNames = CacheConfig.TMDB_TRAILER, key = "'movie:' + #localMovieId")
    public Optional<TrailerResponse> fetchMovieTrailer(Long localMovieId) {
        requireApiKey();
        Movie movie = movieRepository.findById(localMovieId)
                .orElseThrow(() -> new NotFoundException("Movie not found"));
        if (movie.getTmdbId() == null) return Optional.empty();
        return fetchTrailerByTmdb("/movie/{id}/videos", movie.getTmdbId());
    }

    @Cacheable(cacheNames = CacheConfig.TMDB_TRAILER, key = "'series:' + #localSeriesId")
    public Optional<TrailerResponse> fetchSeriesTrailer(Long localSeriesId) {
        requireApiKey();
        Series series = seriesRepository.findById(localSeriesId)
                .orElseThrow(() -> new NotFoundException("Series not found"));
        if (series.getTmdbId() == null) return Optional.empty();
        return fetchTrailerByTmdb("/tv/{id}/videos", series.getTmdbId());
    }

    private Optional<TrailerResponse> fetchTrailerByTmdb(String pathTemplate, Long tmdbId) {
        try {
            TmdbVideosResponse res = tmdbRestClient.get()
                    .uri(uri -> uri.path(pathTemplate)
                            .queryParam("language", "en-US")
                            .build(tmdbId))
                    .retrieve()
                    .body(TmdbVideosResponse.class);
            if (res == null || res.results() == null) return Optional.empty();
            return res.results().stream()
                    .filter(v -> v != null
                            && "YouTube".equalsIgnoreCase(v.site())
                            && v.key() != null
                            && YOUTUBE_KEY.matcher(v.key()).matches())
                    .min(Comparator.comparingInt(TmdbService::trailerRank))
                    .filter(v -> trailerRank(v) < Integer.MAX_VALUE)
                    .map(v -> new TrailerResponse(
                            v.key(),
                            v.name(),
                            v.type(),
                            Boolean.TRUE.equals(v.official())
                    ));
        } catch (Exception e) {
            log.warn("TMDB videos fetch failed for {} tmdbId={}: {}",
                    pathTemplate, tmdbId, e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Ranks TMDB video entries. Lower = higher priority. Official Trailer is
     * the gold standard; falls back to any Trailer, then Teaser. Anything
     * else (Clip, Featurette, Behind the Scenes…) is rejected.
     */
    private static int trailerRank(TmdbVideoEntry v) {
        String type = v.type() == null ? "" : v.type();
        boolean official = Boolean.TRUE.equals(v.official());
        if ("Trailer".equalsIgnoreCase(type) && official) return 0;
        if ("Trailer".equalsIgnoreCase(type)) return 1;
        if ("Teaser".equalsIgnoreCase(type) && official) return 2;
        if ("Teaser".equalsIgnoreCase(type)) return 3;
        return Integer.MAX_VALUE;
    }

    // ===================================================================
    // Backdrop backfill (admin)
    // ===================================================================

    /**
     * Re-fetch TMDB details for every catalog row missing a backdrop and
     * persist what TMDB returns. Idempotent: skips rows that already have a
     * backdrop. Each save is its own short transaction.
     */
    public GenreRefreshResult refreshBackdrops() {
        requireApiKey();
        int updated = 0, skipped = 0, failed = 0;

        for (Movie m : movieRepository.findAll()) {
            if (m.getBackdropUrl() != null && !m.getBackdropUrl().isBlank()) { skipped++; continue; }
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
                String url = buildBackdropUrl(details.backdropPath());
                if (url == null) { skipped++; continue; }
                m.setBackdropUrl(url);
                movieRepository.save(m);
                updated++;
            } catch (Exception e) {
                log.warn("Refresh backdrop failed for movie tmdbId={}: {}", m.getTmdbId(), e.getMessage());
                failed++;
            }
        }

        for (Series s : seriesRepository.findAll()) {
            if (s.getBackdropUrl() != null && !s.getBackdropUrl().isBlank()) { skipped++; continue; }
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
                String url = buildBackdropUrl(details.backdropPath());
                if (url == null) { skipped++; continue; }
                s.setBackdropUrl(url);
                seriesRepository.save(s);
                updated++;
            } catch (Exception e) {
                log.warn("Refresh backdrop failed for series tmdbId={}: {}", s.getTmdbId(), e.getMessage());
                failed++;
            }
        }

        log.info("Backdrop refresh done — updated={} skipped={} failed={}", updated, skipped, failed);
        return new GenreRefreshResult(updated, skipped, failed);
    }

    // ===================================================================
    // TMDB linking (fix rows imported before TMDB integration existed)
    // ===================================================================

    /**
     * Bind an existing local movie to a TMDB id and backfill anything that
     * was missing (poster / backdrop / genres / release date). Idempotent:
     * re-running with the same id is a no-op. Evicts cast + trailer caches
     * so the next request hits the freshly-linked TMDB data.
     */
    @Transactional
    @Caching(evict = {
            @CacheEvict(cacheNames = CacheConfig.TMDB_CAST, allEntries = true),
            @CacheEvict(cacheNames = CacheConfig.TMDB_TRAILER, allEntries = true)
    })
    public MovieResponse linkMovieToTmdb(Long localMovieId, Long tmdbId) {
        requireApiKey();
        Movie movie = movieRepository.findById(localMovieId)
                .orElseThrow(() -> new NotFoundException("Movie not found"));
        if (tmdbId == null || tmdbId <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "tmdbId required");
        }
        Optional<Movie> conflict = movieRepository.findByTmdbId(tmdbId);
        if (conflict.isPresent() && !conflict.get().getId().equals(localMovieId)) {
            Movie other = conflict.get();
            throw new ApiException(HttpStatus.CONFLICT,
                    "TMDB id " + tmdbId + " is already linked to local movie #"
                            + other.getId() + " (\"" + other.getTitle()
                            + "\"). Merge or delete one before linking.");
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
        movie.setTmdbId(details.id());
        if (isBlank(movie.getImageUrl())) {
            movie.setImageUrl(buildPosterUrl(details.posterPath()));
        }
        if (isBlank(movie.getBackdropUrl())) {
            movie.setBackdropUrl(buildBackdropUrl(details.backdropPath()));
        }
        if (movie.getGenres() == null || movie.getGenres().isEmpty()) {
            List<String> genres = allGenres(details.genres());
            if (!genres.isEmpty()) movie.setGenres(genres);
        }
        if (movie.getReleaseDate() == null && details.releaseDate() != null) {
            movie.setReleaseDate(parseDate(details.releaseDate()));
        }
        return MovieResponse.from(movieRepository.save(movie));
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(cacheNames = CacheConfig.TMDB_CAST, allEntries = true),
            @CacheEvict(cacheNames = CacheConfig.TMDB_TRAILER, allEntries = true)
    })
    public SeriesResponse linkSeriesToTmdb(Long localSeriesId, Long tmdbId) {
        requireApiKey();
        Series series = seriesRepository.findById(localSeriesId)
                .orElseThrow(() -> new NotFoundException("Series not found"));
        if (tmdbId == null || tmdbId <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "tmdbId required");
        }
        Optional<Series> conflict = seriesRepository.findByTmdbId(tmdbId);
        if (conflict.isPresent() && !conflict.get().getId().equals(localSeriesId)) {
            Series other = conflict.get();
            throw new ApiException(HttpStatus.CONFLICT,
                    "TMDB id " + tmdbId + " is already linked to local series #"
                            + other.getId() + " (\"" + other.getTitle()
                            + "\"). Merge or delete one before linking.");
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
        series.setTmdbId(details.id());
        if (isBlank(series.getImageUrl())) {
            series.setImageUrl(buildPosterUrl(details.posterPath()));
        }
        if (isBlank(series.getBackdropUrl())) {
            series.setBackdropUrl(buildBackdropUrl(details.backdropPath()));
        }
        if (series.getGenres() == null || series.getGenres().isEmpty()) {
            List<String> genres = allGenres(details.genres());
            if (!genres.isEmpty()) series.setGenres(genres);
        }
        if (series.getFirstAirDate() == null && details.firstAirDate() != null) {
            series.setFirstAirDate(parseDate(details.firstAirDate()));
        }
        if (series.getLastAirDate() == null && details.lastAirDate() != null) {
            series.setLastAirDate(parseDate(details.lastAirDate()));
        }
        if (series.getNumberOfSeasons() == null) {
            series.setNumberOfSeasons(details.numberOfSeasons());
        }
        if (series.getNumberOfEpisodes() == null) {
            series.setNumberOfEpisodes(details.numberOfEpisodes());
        }
        return SeriesResponse.from(seriesRepository.save(series));
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    /**
     * Search-by-title best-effort linking. For every catalog row without a
     * tmdb_id we run the TMDB search; if a result matches title (loose,
     * case-insensitive) AND release year (when present), we link it. Year
     * mismatch is the main de-bias: same title, different release.
     */
    public AutoLinkResult autoLinkMovies() {
        requireApiKey();
        int linked = 0, skipped = 0;
        List<AutoLinkResult.Failure> failures = new ArrayList<>();

        for (Movie m : movieRepository.findAll()) {
            if (m.getTmdbId() != null) { skipped++; continue; }
            try {
                TmdbSearchResponse res = tmdbRestClient.get()
                        .uri(uri -> uri.path("/search/movie")
                                .queryParam("query", m.getTitle())
                                .queryParam("include_adult", false)
                                .queryParam("language", "en-US")
                                .queryParam("page", 1)
                                .build())
                        .retrieve()
                        .body(TmdbSearchResponse.class);
                if (res == null || res.results() == null || res.results().isEmpty()) {
                    failures.add(new AutoLinkResult.Failure(m.getId(), m.getTitle(), "no TMDB results"));
                    continue;
                }
                Integer wantYear = m.getReleaseDate() == null ? null : m.getReleaseDate().getYear();
                TmdbMovie hit = res.results().stream()
                        .filter(r -> r.id() != null && r.title() != null
                                && r.title().equalsIgnoreCase(m.getTitle().trim()))
                        .filter(r -> wantYear == null || sameYear(r.releaseDate(), wantYear))
                        .findFirst()
                        .orElseGet(() -> res.results().stream()
                                .filter(r -> r.id() != null && wantYear != null
                                        && sameYear(r.releaseDate(), wantYear))
                                .findFirst()
                                .orElse(null));
                if (hit == null) {
                    failures.add(new AutoLinkResult.Failure(m.getId(), m.getTitle(), "no confident match"));
                    continue;
                }
                self().linkMovieToTmdb(m.getId(), hit.id());
                linked++;
            } catch (Exception e) {
                failures.add(new AutoLinkResult.Failure(m.getId(), m.getTitle(), e.getMessage()));
            }
        }
        log.info("Auto-link movies done — linked={} skipped={} failed={}",
                linked, skipped, failures.size());
        return new AutoLinkResult(linked, skipped, failures);
    }

    public AutoLinkResult autoLinkSeries() {
        requireApiKey();
        int linked = 0, skipped = 0;
        List<AutoLinkResult.Failure> failures = new ArrayList<>();

        for (Series s : seriesRepository.findAll()) {
            if (s.getTmdbId() != null) { skipped++; continue; }
            try {
                TmdbTvSearchResponse res = tmdbRestClient.get()
                        .uri(uri -> uri.path("/search/tv")
                                .queryParam("query", s.getTitle())
                                .queryParam("include_adult", false)
                                .queryParam("language", "en-US")
                                .queryParam("page", 1)
                                .build())
                        .retrieve()
                        .body(TmdbTvSearchResponse.class);
                if (res == null || res.results() == null || res.results().isEmpty()) {
                    failures.add(new AutoLinkResult.Failure(s.getId(), s.getTitle(), "no TMDB results"));
                    continue;
                }
                Integer wantYear = s.getFirstAirDate() == null ? null : s.getFirstAirDate().getYear();
                TmdbTvShow hit = res.results().stream()
                        .filter(r -> r.id() != null && r.name() != null
                                && r.name().equalsIgnoreCase(s.getTitle().trim()))
                        .filter(r -> wantYear == null || sameYear(r.firstAirDate(), wantYear))
                        .findFirst()
                        .orElseGet(() -> res.results().stream()
                                .filter(r -> r.id() != null && wantYear != null
                                        && sameYear(r.firstAirDate(), wantYear))
                                .findFirst()
                                .orElse(null));
                if (hit == null) {
                    failures.add(new AutoLinkResult.Failure(s.getId(), s.getTitle(), "no confident match"));
                    continue;
                }
                self().linkSeriesToTmdb(s.getId(), hit.id());
                linked++;
            } catch (Exception e) {
                failures.add(new AutoLinkResult.Failure(s.getId(), s.getTitle(), e.getMessage()));
            }
        }
        log.info("Auto-link series done — linked={} skipped={} failed={}",
                linked, skipped, failures.size());
        return new AutoLinkResult(linked, skipped, failures);
    }

    private static boolean sameYear(String tmdbDate, int wantYear) {
        if (tmdbDate == null || tmdbDate.length() < 4) return false;
        try {
            return Integer.parseInt(tmdbDate.substring(0, 4)) == wantYear;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    // ===================================================================
    // Multi-video listing (future improvement: trailer carousel, clips, …)
    // ===================================================================

    /**
     * Every YouTube video TMDB exposes for a movie/series, in TMDB order,
     * filtered by safe key + site. Lets the frontend render a carousel
     * (Trailer / Teaser / Clip / Featurette / Behind the Scenes) without
     * an extra round-trip per type.
     */
    public List<TmdbVideoEntry> fetchMovieVideos(Long localMovieId) {
        requireApiKey();
        Movie movie = movieRepository.findById(localMovieId)
                .orElseThrow(() -> new NotFoundException("Movie not found"));
        if (movie.getTmdbId() == null) return List.of();
        return fetchVideosByTmdb("/movie/{id}/videos", movie.getTmdbId());
    }

    public List<TmdbVideoEntry> fetchSeriesVideos(Long localSeriesId) {
        requireApiKey();
        Series series = seriesRepository.findById(localSeriesId)
                .orElseThrow(() -> new NotFoundException("Series not found"));
        if (series.getTmdbId() == null) return List.of();
        return fetchVideosByTmdb("/tv/{id}/videos", series.getTmdbId());
    }

    private List<TmdbVideoEntry> fetchVideosByTmdb(String pathTemplate, Long tmdbId) {
        try {
            TmdbVideosResponse res = tmdbRestClient.get()
                    .uri(uri -> uri.path(pathTemplate)
                            .queryParam("language", "en-US")
                            .build(tmdbId))
                    .retrieve()
                    .body(TmdbVideosResponse.class);
            if (res == null || res.results() == null) return List.of();
            return res.results().stream()
                    .filter(v -> v != null
                            && "YouTube".equalsIgnoreCase(v.site())
                            && v.key() != null
                            && YOUTUBE_KEY.matcher(v.key()).matches())
                    .toList();
        } catch (Exception e) {
            log.warn("TMDB videos fetch failed for {} tmdbId={}: {}",
                    pathTemplate, tmdbId, e.getMessage());
            return List.of();
        }
    }
}
