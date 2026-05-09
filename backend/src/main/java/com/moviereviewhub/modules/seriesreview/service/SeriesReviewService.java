package com.moviereviewhub.modules.seriesreview.service;

import com.moviereviewhub.common.dto.PagedResponse;
import com.moviereviewhub.exception.ConflictException;
import com.moviereviewhub.exception.NotFoundException;
import com.moviereviewhub.exception.UnauthorizedException;
import com.moviereviewhub.modules.review.dto.MovieRatingStats;
import com.moviereviewhub.modules.review.dto.ReviewRequest;
import com.moviereviewhub.modules.series.domain.Series;
import com.moviereviewhub.modules.series.repository.SeriesRepository;
import com.moviereviewhub.modules.seriesreview.domain.SeriesReview;
import com.moviereviewhub.modules.seriesreview.dto.SeriesReviewResponse;
import com.moviereviewhub.modules.seriesreview.repository.SeriesReviewRepository;
import com.moviereviewhub.modules.user.domain.User;
import com.moviereviewhub.modules.user.domain.UserRole;
import com.moviereviewhub.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SeriesReviewService {

    private final SeriesReviewRepository reviewRepository;
    private final SeriesRepository seriesRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public PagedResponse<SeriesReviewResponse> findBySeries(Long seriesId, Pageable pageable) {
        Page<SeriesReview> page = reviewRepository.findBySeriesId(seriesId, pageable);
        return PagedResponse.from(page, SeriesReviewResponse::from);
    }

    @Transactional(readOnly = true)
    public PagedResponse<SeriesReviewResponse> findByUser(Long userId, Pageable pageable) {
        Page<SeriesReview> page = reviewRepository.findByUserId(userId, pageable);
        return PagedResponse.from(page, SeriesReviewResponse::from);
    }

    @Transactional(readOnly = true)
    public MovieRatingStats getStats(Long seriesId) {
        MovieRatingStats stats = reviewRepository.getRatingStats(seriesId);
        return stats == null ? MovieRatingStats.empty() : stats;
    }

    @Transactional
    public SeriesReviewResponse create(Long userId, Long seriesId, ReviewRequest req) {
        if (reviewRepository.existsByUser_IdAndSeries_IdAndDeletedFalse(userId, seriesId)) {
            throw new ConflictException("You already reviewed this series");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        Series series = seriesRepository.findByIdAndDeletedFalse(seriesId)
                .orElseThrow(() -> new NotFoundException("Series not found"));

        SeriesReview review = SeriesReview.builder()
                .rating(toStoredRating(req.rating()))
                .comment(req.comment())
                .user(user)
                .series(series)
                .build();
        return SeriesReviewResponse.from(reviewRepository.save(review));
    }

    @Transactional
    public SeriesReviewResponse update(Long reviewId, Long userId, ReviewRequest req) {
        SeriesReview review = reviewRepository.findByIdAndDeletedFalse(reviewId)
                .orElseThrow(() -> new NotFoundException("Review not found"));
        if (!review.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("You can only edit your own review");
        }
        review.setRating(toStoredRating(req.rating()));
        review.setComment(req.comment());
        return SeriesReviewResponse.from(reviewRepository.save(review));
    }

    @Transactional(readOnly = true)
    public SeriesReviewResponse findMyReview(Long userId, Long seriesId) {
        SeriesReview review = reviewRepository
                .findByUser_IdAndSeries_IdAndDeletedFalse(userId, seriesId)
                .orElseThrow(() -> new NotFoundException("Review not found"));
        return SeriesReviewResponse.from(review);
    }

    private static int toStoredRating(Double apiRating) {
        return (int) Math.round(apiRating * 2.0);
    }

    @Transactional
    public void delete(Long reviewId, Long userId, UserRole role) {
        SeriesReview review = reviewRepository.findByIdAndDeletedFalse(reviewId)
                .orElseThrow(() -> new NotFoundException("Review not found"));
        boolean isOwner = review.getUser().getId().equals(userId);
        boolean isAdmin = role == UserRole.ROLE_ADMIN;
        if (!isOwner && !isAdmin) {
            throw new UnauthorizedException("Cannot delete this review");
        }
        review.setDeleted(true);
        reviewRepository.save(review);
    }
}
