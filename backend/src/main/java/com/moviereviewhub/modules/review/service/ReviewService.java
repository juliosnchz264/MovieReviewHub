package com.moviereviewhub.modules.review.service;

import com.moviereviewhub.common.dto.PagedResponse;
import com.moviereviewhub.exception.ConflictException;
import com.moviereviewhub.exception.NotFoundException;
import com.moviereviewhub.exception.UnauthorizedException;
import com.moviereviewhub.modules.movie.domain.Movie;
import com.moviereviewhub.modules.movie.repository.MovieRepository;
import com.moviereviewhub.modules.review.domain.Review;
import com.moviereviewhub.modules.review.dto.MovieRatingStats;
import com.moviereviewhub.modules.review.dto.ReviewRequest;
import com.moviereviewhub.modules.review.dto.ReviewResponse;
import com.moviereviewhub.modules.review.repository.ReviewRepository;
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
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final MovieRepository movieRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public PagedResponse<ReviewResponse> findByMovie(Long movieId, Pageable pageable) {
        Page<Review> page = reviewRepository.findByMovieId(movieId, pageable);
        return PagedResponse.from(page, ReviewResponse::from);
    }

    @Transactional(readOnly = true)
    public PagedResponse<ReviewResponse> findByUser(Long userId, Pageable pageable) {
        Page<Review> page = reviewRepository.findByUserId(userId, pageable);
        return PagedResponse.from(page, ReviewResponse::from);
    }

    @Transactional(readOnly = true)
    public MovieRatingStats getStats(Long movieId) {
        MovieRatingStats stats = reviewRepository.getRatingStats(movieId);
        return stats == null ? MovieRatingStats.empty() : stats;
    }

    @Transactional
    public ReviewResponse create(Long userId, Long movieId, ReviewRequest req) {
        if (reviewRepository.existsByUser_IdAndMovie_IdAndDeletedFalse(userId, movieId)) {
            throw new ConflictException("You already reviewed this movie");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        Movie movie = movieRepository.findByIdAndDeletedFalse(movieId)
                .orElseThrow(() -> new NotFoundException("Movie not found"));

        Review review = Review.builder()
                .rating(toStoredRating(req.rating()))
                .comment(req.comment())
                .user(user)
                .movie(movie)
                .build();
        return ReviewResponse.from(reviewRepository.save(review));
    }

    @Transactional
    public ReviewResponse update(Long reviewId, Long userId, ReviewRequest req) {
        Review review = reviewRepository.findByIdAndDeletedFalse(reviewId)
                .orElseThrow(() -> new NotFoundException("Review not found"));
        if (!review.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("You can only edit your own review");
        }
        review.setRating(toStoredRating(req.rating()));
        review.setComment(req.comment());
        return ReviewResponse.from(reviewRepository.save(review));
    }

    @Transactional(readOnly = true)
    public ReviewResponse findMyReview(Long userId, Long movieId) {
        Review review = reviewRepository
                .findByUser_IdAndMovie_IdAndDeletedFalse(userId, movieId)
                .orElseThrow(() -> new NotFoundException("Review not found"));
        return ReviewResponse.from(review);
    }

    private static int toStoredRating(Double apiRating) {
        return (int) Math.round(apiRating * 2.0);
    }

    @Transactional
    public void delete(Long reviewId, Long userId, UserRole role) {
        Review review = reviewRepository.findByIdAndDeletedFalse(reviewId)
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
