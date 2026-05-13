package com.moviereviewhub.modules.seriesreview.controller;

import com.moviereviewhub.common.dto.PagedResponse;
import com.moviereviewhub.modules.review.dto.MovieRatingStats;
import com.moviereviewhub.modules.review.dto.ReviewRequest;
import com.moviereviewhub.modules.reviewsocial.dto.ReviewCardResponse;
import com.moviereviewhub.modules.seriesreview.dto.SeriesReviewResponse;
import com.moviereviewhub.modules.seriesreview.service.SeriesReviewService;
import com.moviereviewhub.security.userdetails.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class SeriesReviewController {

    private final SeriesReviewService reviewService;

    @GetMapping("/api/v1/series/{seriesId:\\d+}/reviews")
    public ResponseEntity<PagedResponse<SeriesReviewResponse>> findBySeries(
            @PathVariable Long seriesId,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(reviewService.findBySeries(seriesId, pageable));
    }

    @GetMapping("/api/v1/series/{seriesId:\\d+}/reviews/popular")
    public ResponseEntity<List<ReviewCardResponse>> popular(
            @PathVariable Long seriesId,
            @RequestParam(defaultValue = "3") int limit,
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        return ResponseEntity.ok(reviewService.findPopularSection(
                seriesId, clampLimit(limit), userId(principal)));
    }

    @GetMapping("/api/v1/series/{seriesId:\\d+}/reviews/recent")
    public ResponseEntity<List<ReviewCardResponse>> recent(
            @PathVariable Long seriesId,
            @RequestParam(defaultValue = "3") int limit,
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        return ResponseEntity.ok(reviewService.findRecentSection(
                seriesId, clampLimit(limit), userId(principal)));
    }

    @GetMapping("/api/v1/series/{seriesId:\\d+}/reviews/feed")
    public ResponseEntity<PagedResponse<ReviewCardResponse>> feed(
            @PathVariable Long seriesId,
            @RequestParam(defaultValue = "recent") String sort,
            @PageableDefault(size = 12) Pageable pageable,
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        return ResponseEntity.ok(reviewService.findFeed(
                seriesId, sort, pageable, userId(principal)));
    }

    @GetMapping("/api/v1/series-reviews/{id:\\d+}")
    public ResponseEntity<ReviewCardResponse> findOne(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        return ResponseEntity.ok(reviewService.findCardById(id, userId(principal)));
    }

    @GetMapping("/api/v1/series/{seriesId:\\d+}/reviews/stats")
    public ResponseEntity<MovieRatingStats> stats(@PathVariable Long seriesId) {
        return ResponseEntity.ok(reviewService.getStats(seriesId));
    }

    @GetMapping("/api/v1/series/{seriesId:\\d+}/reviews/me")
    public ResponseEntity<SeriesReviewResponse> myReview(
            @PathVariable Long seriesId,
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        return ResponseEntity.ok(reviewService.findMyReview(principal.getId(), seriesId));
    }

    @PostMapping("/api/v1/series/{seriesId:\\d+}/reviews")
    public ResponseEntity<SeriesReviewResponse> create(
            @PathVariable Long seriesId,
            @Valid @RequestBody ReviewRequest req,
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        return ResponseEntity.status(201).body(
                reviewService.create(principal.getId(), seriesId, req)
        );
    }

    @GetMapping("/api/v1/users/me/series-reviews")
    public ResponseEntity<PagedResponse<SeriesReviewResponse>> myReviews(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(reviewService.findByUser(principal.getId(), pageable));
    }

    @PutMapping("/api/v1/series-reviews/{id:\\d+}")
    public ResponseEntity<SeriesReviewResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ReviewRequest req,
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        return ResponseEntity.ok(reviewService.update(id, principal.getId(), req));
    }

    @DeleteMapping("/api/v1/series-reviews/{id:\\d+}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        reviewService.delete(id, principal.getId(), principal.getUser().getRole());
        return ResponseEntity.noContent().build();
    }

    private static Long userId(CustomUserDetails principal) {
        return principal != null ? principal.getId() : null;
    }

    private static int clampLimit(int limit) {
        if (limit < 1) return 1;
        if (limit > 50) return 50;
        return limit;
    }
}
