package com.moviereviewhub.modules.seriesfavorite.controller;

import com.moviereviewhub.common.dto.PagedResponse;
import com.moviereviewhub.modules.series.dto.SeriesResponse;
import com.moviereviewhub.modules.seriesfavorite.service.SeriesFavoriteService;
import com.moviereviewhub.security.userdetails.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/users/me/series-favorites")
@RequiredArgsConstructor
public class SeriesFavoriteController {

    private final SeriesFavoriteService favoriteService;

    @GetMapping
    public ResponseEntity<PagedResponse<SeriesResponse>> myFavorites(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(favoriteService.findMyFavorites(principal.getId(), pageable));
    }

    @GetMapping("/{seriesId:\\d+}")
    public ResponseEntity<Map<String, Boolean>> isFavorite(
            @PathVariable Long seriesId,
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        return ResponseEntity.ok(Map.of(
                "favorite", favoriteService.isFavorite(principal.getId(), seriesId)
        ));
    }

    @PostMapping("/{seriesId:\\d+}")
    public ResponseEntity<Void> add(
            @PathVariable Long seriesId,
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        favoriteService.add(principal.getId(), seriesId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{seriesId:\\d+}")
    public ResponseEntity<Void> remove(
            @PathVariable Long seriesId,
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        favoriteService.remove(principal.getId(), seriesId);
        return ResponseEntity.noContent().build();
    }
}
