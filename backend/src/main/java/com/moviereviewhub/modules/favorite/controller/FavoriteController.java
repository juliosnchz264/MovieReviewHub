package com.moviereviewhub.modules.favorite.controller;

import com.moviereviewhub.common.dto.PagedResponse;
import com.moviereviewhub.modules.favorite.service.FavoriteService;
import com.moviereviewhub.modules.movie.dto.MovieResponse;
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
@RequestMapping("/api/v1/users/me/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;

    @GetMapping
    public ResponseEntity<PagedResponse<MovieResponse>> myFavorites(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(favoriteService.findMyFavorites(principal.getId(), pageable));
    }

    @GetMapping("/{movieId}")
    public ResponseEntity<Map<String, Boolean>> isFavorite(
            @PathVariable Long movieId,
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        return ResponseEntity.ok(Map.of(
                "favorite", favoriteService.isFavorite(principal.getId(), movieId)
        ));
    }

    @PostMapping("/{movieId}")
    public ResponseEntity<Void> add(
            @PathVariable Long movieId,
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        favoriteService.add(principal.getId(), movieId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{movieId}")
    public ResponseEntity<Void> remove(
            @PathVariable Long movieId,
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        favoriteService.remove(principal.getId(), movieId);
        return ResponseEntity.noContent().build();
    }
}
