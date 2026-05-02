package com.moviereviewhub.modules.movie.controller;

import com.moviereviewhub.common.dto.PagedResponse;
import com.moviereviewhub.modules.movie.dto.MovieRequest;
import com.moviereviewhub.modules.movie.dto.MovieResponse;
import com.moviereviewhub.modules.movie.service.MovieService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/movies")
@RequiredArgsConstructor
public class MovieController {

    private final MovieService movieService;

    @GetMapping
    public ResponseEntity<PagedResponse<MovieResponse>> search(
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String genre,
            @PageableDefault(size = 20, sort = "releaseDate") Pageable pageable
    ) {
        return ResponseEntity.ok(movieService.search(title, genre, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MovieResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(movieService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MovieResponse> create(@Valid @RequestBody MovieRequest req) {
        MovieResponse created = movieService.create(req);
        return ResponseEntity.created(URI.create("/api/v1/movies/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MovieResponse> update(@PathVariable Long id,
                                                @Valid @RequestBody MovieRequest req) {
        return ResponseEntity.ok(movieService.update(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        movieService.softDelete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/trending")
    public ResponseEntity<List<MovieResponse>> trending(
            @RequestParam(defaultValue = "10") int limit
    ) {
        return ResponseEntity.ok(movieService.trending(Math.min(limit, 50)));
    }

    @GetMapping("/top-rated")
    public ResponseEntity<List<MovieResponse>> topRated(
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "3") int minReviews
    ) {
        return ResponseEntity.ok(movieService.topRated(Math.min(limit, 50), minReviews));
    }

    @GetMapping("/{id}/similar")
    public ResponseEntity<List<MovieResponse>> similar(
            @PathVariable Long id,
            @RequestParam(defaultValue = "8") int limit
    ) {
        return ResponseEntity.ok(movieService.similar(id, Math.min(limit, 20)));
    }
}
