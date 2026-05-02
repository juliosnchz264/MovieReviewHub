package com.moviereviewhub.modules.series.controller;

import com.moviereviewhub.common.dto.PagedResponse;
import com.moviereviewhub.modules.series.dto.SeriesRequest;
import com.moviereviewhub.modules.series.dto.SeriesResponse;
import com.moviereviewhub.modules.series.service.SeriesService;
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
@RequestMapping("/api/v1/series")
@RequiredArgsConstructor
public class SeriesController {

    private final SeriesService seriesService;

    @GetMapping
    public ResponseEntity<PagedResponse<SeriesResponse>> search(
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String genre,
            @PageableDefault(size = 20, sort = "firstAirDate") Pageable pageable
    ) {
        return ResponseEntity.ok(seriesService.search(title, genre, pageable));
    }

    @GetMapping("/{id:\\d+}")
    public ResponseEntity<SeriesResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(seriesService.findById(id));
    }

    @GetMapping("/{id:\\d+}/similar")
    public ResponseEntity<List<SeriesResponse>> similar(
            @PathVariable Long id,
            @RequestParam(defaultValue = "8") int limit
    ) {
        return ResponseEntity.ok(seriesService.similar(id, Math.min(limit, 20)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SeriesResponse> create(@Valid @RequestBody SeriesRequest req) {
        SeriesResponse created = seriesService.create(req);
        return ResponseEntity.created(URI.create("/api/v1/series/" + created.id())).body(created);
    }

    @PutMapping("/{id:\\d+}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SeriesResponse> update(@PathVariable Long id,
                                                 @Valid @RequestBody SeriesRequest req) {
        return ResponseEntity.ok(seriesService.update(id, req));
    }

    @DeleteMapping("/{id:\\d+}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        seriesService.softDelete(id);
        return ResponseEntity.noContent().build();
    }
}
