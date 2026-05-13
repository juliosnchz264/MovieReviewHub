package com.moviereviewhub.modules.reviewsocial.service;

import com.moviereviewhub.exception.BadRequestException;
import com.moviereviewhub.exception.NotFoundException;
import com.moviereviewhub.modules.review.repository.ReviewRepository;
import com.moviereviewhub.modules.reviewsocial.domain.ReviewLike;
import com.moviereviewhub.modules.reviewsocial.domain.ReviewTargetType;
import com.moviereviewhub.modules.reviewsocial.dto.LikeStateResponse;
import com.moviereviewhub.modules.reviewsocial.repository.ReviewLikeRepository;
import com.moviereviewhub.modules.seriesreview.repository.SeriesReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReviewLikeService {

    private final ReviewLikeRepository likeRepository;
    private final ReviewRepository reviewRepository;
    private final SeriesReviewRepository seriesReviewRepository;

    @Transactional
    public LikeStateResponse like(Long userId, ReviewTargetType type, Long reviewId) {
        Long ownerId = resolveOwnerId(type, reviewId);
        if (ownerId.equals(userId)) {
            throw new BadRequestException("You can't like your own review");
        }
        if (!likeRepository.existsByUserIdAndTargetTypeAndTargetId(userId, type, reviewId)) {
            try {
                likeRepository.saveAndFlush(ReviewLike.builder()
                        .userId(userId)
                        .targetType(type)
                        .targetId(reviewId)
                        .build());
            } catch (DataIntegrityViolationException ignored) {
                // Concurrent insert won the race — fine, our intent is satisfied.
            }
        }
        return new LikeStateResponse(
                reviewId,
                type,
                true,
                likeRepository.countByTargetTypeAndTargetId(type, reviewId)
        );
    }

    @Transactional
    public LikeStateResponse unlike(Long userId, ReviewTargetType type, Long reviewId) {
        // Validate target still exists so caller gets 404 instead of a silent no-op.
        resolveOwnerId(type, reviewId);
        likeRepository.deleteByUserIdAndTargetTypeAndTargetId(userId, type, reviewId);
        return new LikeStateResponse(
                reviewId,
                type,
                false,
                likeRepository.countByTargetTypeAndTargetId(type, reviewId)
        );
    }

    @Transactional(readOnly = true)
    public LikeStateResponse currentState(Long userId, ReviewTargetType type, Long reviewId) {
        resolveOwnerId(type, reviewId);
        boolean liked = userId != null
                && likeRepository.existsByUserIdAndTargetTypeAndTargetId(userId, type, reviewId);
        return new LikeStateResponse(
                reviewId,
                type,
                liked,
                likeRepository.countByTargetTypeAndTargetId(type, reviewId)
        );
    }

    private Long resolveOwnerId(ReviewTargetType type, Long reviewId) {
        return switch (type) {
            case MOVIE -> reviewRepository.findOwnerIdById(reviewId)
                    .orElseThrow(() -> new NotFoundException("Review not found"));
            case SERIES -> seriesReviewRepository.findOwnerIdById(reviewId)
                    .orElseThrow(() -> new NotFoundException("Review not found"));
        };
    }
}
