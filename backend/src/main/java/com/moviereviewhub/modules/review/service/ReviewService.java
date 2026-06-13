package com.moviereviewhub.modules.review.service;

import com.moviereviewhub.common.dto.PagedResponse;
import com.moviereviewhub.exception.ConflictException;
import com.moviereviewhub.exception.NotFoundException;
import com.moviereviewhub.exception.UnauthorizedException;
import com.moviereviewhub.modules.movie.domain.Movie;
import com.moviereviewhub.modules.movie.repository.MovieRepository;
import com.moviereviewhub.modules.notification.service.event.ReviewDeletedEvent;
import com.moviereviewhub.modules.review.domain.Review;
import com.moviereviewhub.modules.review.dto.MovieRatingStats;
import com.moviereviewhub.modules.review.dto.ReviewRequest;
import com.moviereviewhub.modules.review.dto.ReviewResponse;
import com.moviereviewhub.modules.review.repository.ReviewRepository;
import com.moviereviewhub.modules.reviewsocial.domain.ReviewTargetType;
import com.moviereviewhub.modules.reviewsocial.dto.ReviewCardResponse;
import com.moviereviewhub.modules.reviewsocial.dto.ReviewCardSource;
import com.moviereviewhub.modules.reviewsocial.service.ReviewSocialEnrichmentService;
import com.moviereviewhub.modules.user.domain.User;
import com.moviereviewhub.modules.user.domain.UserRole;
import com.moviereviewhub.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final MovieRepository movieRepository;
    private final UserRepository userRepository;
    private final ReviewSocialEnrichmentService enrichmentService;
    private final ApplicationEventPublisher eventPublisher;

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

    // ------------- Social-aware endpoints -------------

    @Transactional(readOnly = true)
    public List<ReviewCardResponse> findPopularSection(
            Long movieId, int limit, Long currentUserId) {
        Movie movie = loadMovie(movieId);
        List<Long> ids = reviewRepository.findPopularIds(movieId, limit);
        return loadAndEnrich(movie, ids, currentUserId);
    }

    @Transactional(readOnly = true)
    public List<ReviewCardResponse> findRecentSection(
            Long movieId, int limit, Long currentUserId) {
        Movie movie = loadMovie(movieId);
        Page<Review> page = reviewRepository.findByMovieId(movieId, PageRequest.of(0, limit));
        List<ReviewCardSource> sources = page.getContent().stream()
                .map(this::toSource).toList();
        return enrichmentService.enrich(ReviewTargetType.MOVIE, movie.getId(),
                movie.getTitle(), movie.getImageUrl(), sources, currentUserId);
    }

    @Transactional(readOnly = true)
    public PagedResponse<ReviewCardResponse> findFeed(
            Long movieId, String sort, Pageable pageable, Long currentUserId) {
        Movie movie = loadMovie(movieId);
        // Strip any Sort that Spring Data Web bound from `?sort=` — the repo
        // queries already define their own ORDER BY and appending more breaks them.
        Pageable safe = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        Page<Review> page = "popular".equalsIgnoreCase(sort)
                ? loadPopularPage(movieId, safe)
                : reviewRepository.findByMovieId(movieId, safe);
        List<ReviewCardSource> sources = page.getContent().stream()
                .map(this::toSource).toList();
        List<ReviewCardResponse> cards = enrichmentService.enrich(
                ReviewTargetType.MOVIE, movie.getId(), movie.getTitle(),
                movie.getImageUrl(), sources, currentUserId);
        return new PagedResponse<>(
                cards,
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isFirst(),
                page.isLast()
        );
    }

    @Transactional(readOnly = true)
    public ReviewCardResponse findCardById(Long reviewId, Long currentUserId) {
        Review review = reviewRepository.findByIdAndDeletedFalse(reviewId)
                .orElseThrow(() -> new NotFoundException("Review not found"));
        Movie movie = review.getMovie();
        return enrichmentService.enrichSingle(
                ReviewTargetType.MOVIE,
                movie.getId(),
                movie.getTitle(),
                movie.getImageUrl(),
                toSource(review),
                currentUserId
        );
    }

    private Page<Review> loadPopularPage(Long movieId, Pageable pageable) {
        Page<Long> idPage = reviewRepository.findPopularIdsPage(movieId, pageable);
        if (idPage.isEmpty()) {
            return new PageImpl<>(List.of(), pageable, idPage.getTotalElements());
        }
        List<Review> reviews = reviewRepository.findAllByIdsFetchUser(idPage.getContent());
        Map<Long, Review> byId = new HashMap<>();
        reviews.forEach(r -> byId.put(r.getId(), r));
        List<Review> ordered = idPage.getContent().stream()
                .map(byId::get)
                .filter(java.util.Objects::nonNull)
                .toList();
        return new PageImpl<>(ordered, pageable, idPage.getTotalElements());
    }

    private List<ReviewCardResponse> loadAndEnrich(
            Movie movie, List<Long> ids, Long currentUserId) {
        if (ids.isEmpty()) return List.of();
        List<Review> reviews = reviewRepository.findAllByIdsFetchUser(ids);
        Map<Long, Review> byId = new HashMap<>();
        reviews.forEach(r -> byId.put(r.getId(), r));
        List<ReviewCardSource> sources = ids.stream()
                .map(byId::get)
                .filter(java.util.Objects::nonNull)
                .map(this::toSource)
                .toList();
        return enrichmentService.enrich(ReviewTargetType.MOVIE, movie.getId(),
                movie.getTitle(), movie.getImageUrl(), sources, currentUserId);
    }

    private Movie loadMovie(Long movieId) {
        return movieRepository.findByIdAndDeletedFalse(movieId)
                .orElseThrow(() -> new NotFoundException("Movie not found"));
    }

    private ReviewCardSource toSource(Review r) {
        User u = r.getUser();
        return new ReviewCardSource(
                r.getId(),
                r.getRating(),
                r.getComment(),
                r.getCreatedAt(),
                r.getUpdatedAt(),
                u.getId(),
                u.getUsername(),
                u.getAvatarUrl(),
                r.getLikeCount() != null ? r.getLikeCount() : 0L,
                r.getReplyCount() != null ? r.getReplyCount() : 0L
        );
    }

    // ------------- Mutations -------------

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

    /**
     * Optional lookup: returns the current user's review for the given movie,
     * or null if they have not reviewed it. Frontend uses this to know whether
     * to render "rate" vs "edit your review", so absence is the common case —
     * a null body keeps logs clean instead of spamming 404s.
     */
    @Transactional(readOnly = true)
    public ReviewResponse findMyReview(Long userId, Long movieId) {
        return reviewRepository
                .findByUser_IdAndMovie_IdAndDeletedFalse(userId, movieId)
                .map(ReviewResponse::from)
                .orElse(null);
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
        enrichmentService.purgeForReview(ReviewTargetType.MOVIE, reviewId);
        // Notifications pointing at this review become tombstones — clean them up
        // AFTER_COMMIT so the soft delete is durable before we touch the bell feed.
        eventPublisher.publishEvent(new ReviewDeletedEvent(ReviewTargetType.MOVIE, reviewId));
    }
}
