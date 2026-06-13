package com.moviereviewhub.modules.tmdb.controller;

import com.moviereviewhub.modules.movie.dto.MovieResponse;
import com.moviereviewhub.modules.series.dto.SeriesResponse;
import com.moviereviewhub.modules.tmdb.dto.AutoLinkResult;
import com.moviereviewhub.modules.tmdb.dto.AwardSyncRequest;
import com.moviereviewhub.modules.tmdb.dto.AwardSyncResult;
import com.moviereviewhub.modules.tmdb.dto.GenreRefreshResult;
import com.moviereviewhub.modules.tmdb.dto.TmdbMovieView;
import com.moviereviewhub.modules.tmdb.dto.TmdbTvView;
import com.moviereviewhub.modules.tmdb.service.TmdbService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/tmdb")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class TmdbController {

    private final TmdbService tmdbService;

    @GetMapping("/search")
    public ResponseEntity<List<TmdbMovieView>> search(@RequestParam String query) {
        return ResponseEntity.ok(tmdbService.search(query));
    }

    @GetMapping("/popular")
    public ResponseEntity<List<TmdbMovieView>> popular() {
        return ResponseEntity.ok(tmdbService.popular());
    }

    @PostMapping("/import/{tmdbId}")
    public ResponseEntity<MovieResponse> importMovie(@PathVariable Long tmdbId) {
        return ResponseEntity.status(201).body(tmdbService.importMovie(tmdbId));
    }

    // -----------------------------------------------------------------
    // TV / Series endpoints
    // -----------------------------------------------------------------

    @GetMapping("/tv/search")
    public ResponseEntity<List<TmdbTvView>> searchTv(@RequestParam String query) {
        return ResponseEntity.ok(tmdbService.searchTv(query));
    }

    @GetMapping("/tv/popular")
    public ResponseEntity<List<TmdbTvView>> popularTv() {
        return ResponseEntity.ok(tmdbService.popularTv());
    }

    @PostMapping("/tv/import/{tmdbId}")
    public ResponseEntity<SeriesResponse> importSeries(@PathVariable Long tmdbId) {
        return ResponseEntity.status(201).body(tmdbService.importSeries(tmdbId));
    }

    // -----------------------------------------------------------------
    // Backfill endpoints — re-fetch TMDB para actualizar generos en rows
    // ya importadas antes de soportar multi-genero.
    // -----------------------------------------------------------------

    @PostMapping("/refresh-genres/movies")
    public ResponseEntity<GenreRefreshResult> refreshMovieGenres() {
        return ResponseEntity.ok(tmdbService.refreshMovieGenres());
    }

    @PostMapping("/refresh-genres/series")
    public ResponseEntity<GenreRefreshResult> refreshSeriesGenres() {
        return ResponseEntity.ok(tmdbService.refreshSeriesGenres());
    }

    @PostMapping("/refresh-backdrops")
    public ResponseEntity<GenreRefreshResult> refreshBackdrops() {
        return ResponseEntity.ok(tmdbService.refreshBackdrops());
    }

    // -----------------------------------------------------------------
    // TMDB linking — fixes rows imported before the TMDB integration
    // existed (no tmdb_id, so cast + trailer return empty).
    // -----------------------------------------------------------------

    @PostMapping("/link/movie/{movieId}")
    public ResponseEntity<MovieResponse> linkMovie(
            @PathVariable Long movieId,
            @RequestParam Long tmdbId
    ) {
        return ResponseEntity.ok(tmdbService.linkMovieToTmdb(movieId, tmdbId));
    }

    @PostMapping("/link/series/{seriesId}")
    public ResponseEntity<SeriesResponse> linkSeries(
            @PathVariable Long seriesId,
            @RequestParam Long tmdbId
    ) {
        return ResponseEntity.ok(tmdbService.linkSeriesToTmdb(seriesId, tmdbId));
    }

    @PostMapping("/auto-link/movies")
    public ResponseEntity<AutoLinkResult> autoLinkMovies() {
        return ResponseEntity.ok(tmdbService.autoLinkMovies());
    }

    @PostMapping("/auto-link/series")
    public ResponseEntity<AutoLinkResult> autoLinkSeries() {
        return ResponseEntity.ok(tmdbService.autoLinkSeries());
    }

    @PostMapping("/awards/sync")
    public ResponseEntity<AwardSyncResult> syncAwards(@Valid @RequestBody AwardSyncRequest request) {
        return ResponseEntity.ok(tmdbService.syncAwards(request.items()));
    }
}
