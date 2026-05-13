package com.moviereviewhub.modules.reviewsocial.controller;

import com.moviereviewhub.common.dto.PagedResponse;
import com.moviereviewhub.modules.reviewsocial.domain.ReviewTargetType;
import com.moviereviewhub.modules.reviewsocial.dto.LikeStateResponse;
import com.moviereviewhub.modules.reviewsocial.dto.ReviewReplyRequest;
import com.moviereviewhub.modules.reviewsocial.dto.ReviewReplyResponse;
import com.moviereviewhub.modules.reviewsocial.service.ReviewLikeService;
import com.moviereviewhub.modules.reviewsocial.service.ReviewReplyService;
import com.moviereviewhub.modules.user.domain.UserRole;
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
public class ReviewSocialController {

    private final ReviewLikeService likeService;
    private final ReviewReplyService replyService;

    // ---------- MOVIE REVIEW LIKES ----------

    @PostMapping("/api/v1/reviews/{id:\\d+}/like")
    public ResponseEntity<LikeStateResponse> likeMovieReview(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(likeService.like(principal.getId(), ReviewTargetType.MOVIE, id));
    }

    @DeleteMapping("/api/v1/reviews/{id:\\d+}/like")
    public ResponseEntity<LikeStateResponse> unlikeMovieReview(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(likeService.unlike(principal.getId(), ReviewTargetType.MOVIE, id));
    }

    @GetMapping("/api/v1/reviews/{id:\\d+}/like")
    public ResponseEntity<LikeStateResponse> movieLikeState(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal) {
        Long uid = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(likeService.currentState(uid, ReviewTargetType.MOVIE, id));
    }

    // ---------- SERIES REVIEW LIKES ----------

    @PostMapping("/api/v1/series-reviews/{id:\\d+}/like")
    public ResponseEntity<LikeStateResponse> likeSeriesReview(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(likeService.like(principal.getId(), ReviewTargetType.SERIES, id));
    }

    @DeleteMapping("/api/v1/series-reviews/{id:\\d+}/like")
    public ResponseEntity<LikeStateResponse> unlikeSeriesReview(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(likeService.unlike(principal.getId(), ReviewTargetType.SERIES, id));
    }

    @GetMapping("/api/v1/series-reviews/{id:\\d+}/like")
    public ResponseEntity<LikeStateResponse> seriesLikeState(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal) {
        Long uid = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(likeService.currentState(uid, ReviewTargetType.SERIES, id));
    }

    // ---------- MOVIE REVIEW REPLIES ----------

    @GetMapping("/api/v1/reviews/{id:\\d+}/replies")
    public ResponseEntity<PagedResponse<ReviewReplyResponse>> listMovieReplies(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal,
            @PageableDefault(size = 20) Pageable pageable) {
        Long uid = principal != null ? principal.getId() : null;
        UserRole role = principal != null ? principal.getUser().getRole() : null;
        return ResponseEntity.ok(
                replyService.list(ReviewTargetType.MOVIE, id, uid, role, pageable));
    }

    @PostMapping("/api/v1/reviews/{id:\\d+}/replies")
    public ResponseEntity<ReviewReplyResponse> createMovieReply(
            @PathVariable Long id,
            @Valid @RequestBody ReviewReplyRequest req,
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.status(201).body(
                replyService.create(principal.getId(), ReviewTargetType.MOVIE, id, req));
    }

    // ---------- SERIES REVIEW REPLIES ----------

    @GetMapping("/api/v1/series-reviews/{id:\\d+}/replies")
    public ResponseEntity<PagedResponse<ReviewReplyResponse>> listSeriesReplies(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal,
            @PageableDefault(size = 20) Pageable pageable) {
        Long uid = principal != null ? principal.getId() : null;
        UserRole role = principal != null ? principal.getUser().getRole() : null;
        return ResponseEntity.ok(
                replyService.list(ReviewTargetType.SERIES, id, uid, role, pageable));
    }

    @PostMapping("/api/v1/series-reviews/{id:\\d+}/replies")
    public ResponseEntity<ReviewReplyResponse> createSeriesReply(
            @PathVariable Long id,
            @Valid @RequestBody ReviewReplyRequest req,
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.status(201).body(
                replyService.create(principal.getId(), ReviewTargetType.SERIES, id, req));
    }

    // ---------- REPLY EDIT/DELETE (shared) ----------

    @PutMapping("/api/v1/review-replies/{id:\\d+}")
    public ResponseEntity<ReviewReplyResponse> updateReply(
            @PathVariable Long id,
            @Valid @RequestBody ReviewReplyRequest req,
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(replyService.update(id, principal.getId(), req));
    }

    @DeleteMapping("/api/v1/review-replies/{id:\\d+}")
    public ResponseEntity<Void> deleteReply(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails principal) {
        replyService.delete(id, principal.getId(), principal.getUser().getRole());
        return ResponseEntity.noContent().build();
    }
}
