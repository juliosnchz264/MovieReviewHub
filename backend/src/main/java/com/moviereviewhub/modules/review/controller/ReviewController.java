package com.moviereviewhub.modules.review.controller;

import com.moviereviewhub.common.dto.PagedResponse;
import com.moviereviewhub.modules.review.dto.MovieRatingStats;
import com.moviereviewhub.modules.review.dto.ReviewRequest;
import com.moviereviewhub.modules.review.dto.ReviewResponse;
import com.moviereviewhub.modules.review.service.ReviewService;
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
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @GetMapping("/api/v1/movies/{movieId}/reviews")
    public ResponseEntity<PagedResponse<ReviewResponse>> findByMovie(
            @PathVariable Long movieId,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(reviewService.findByMovie(movieId, pageable));
    }

    @GetMapping("/api/v1/movies/{movieId}/reviews/stats")
    public ResponseEntity<MovieRatingStats> stats(@PathVariable Long movieId) {
        return ResponseEntity.ok(reviewService.getStats(movieId));
    }

    @GetMapping("/api/v1/movies/{movieId}/reviews/me")
    public ResponseEntity<ReviewResponse> myReview(
            @PathVariable Long movieId,
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        return ResponseEntity.ok(reviewService.findMyReview(principal.getId(), movieId));
    }

    @PostMapping("/api/v1/movies/{movieId}/reviews")
    public ResponseEntity<ReviewResponse> create(
            @PathVariable Long movieId,
            @Valid @RequestBody ReviewRequest req,
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        return ResponseEntity.status(201).body(
                reviewService.create(principal.getId(), movieId, req)
        );
    }

    @GetMapping("/api/v1/users/me/reviews")
    public ResponseEntity<PagedResponse<ReviewResponse>> myReviews(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(reviewService.findByUser(principal.getId(), pageable));
    }

    @PutMapping("/api/v1/reviews/{id}")
    public ResponseEntity<ReviewResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ReviewRequest req,
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        return ResponseEntity.ok(reviewService.update(id, principal.getId(), req));
    }

    @DeleteMapping("/api/v1/reviews/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        reviewService.delete(id, principal.getId(), principal.getUser().getRole());
        return ResponseEntity.noContent().build();
    }
}
