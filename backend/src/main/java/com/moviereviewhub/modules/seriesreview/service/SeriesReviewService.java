package com.moviereviewhub.modules.seriesreview.service;

import com.moviereviewhub.common.dto.PagedResponse;
import com.moviereviewhub.exception.ConflictException;
import com.moviereviewhub.exception.NotFoundException;
import com.moviereviewhub.exception.UnauthorizedException;
import com.moviereviewhub.modules.review.dto.MovieRatingStats;
import com.moviereviewhub.modules.review.dto.ReviewRequest;
import com.moviereviewhub.modules.reviewsocial.domain.ReviewTargetType;
import com.moviereviewhub.modules.reviewsocial.dto.ReviewCardResponse;
import com.moviereviewhub.modules.reviewsocial.dto.ReviewCardSource;
import com.moviereviewhub.modules.reviewsocial.service.ReviewSocialEnrichmentService;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class SeriesReviewService {

    private final SeriesReviewRepository reviewRepository;
    private final SeriesRepository seriesRepository;
    private final UserRepository userRepository;
    private final ReviewSocialEnrichmentService enrichmentService;

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

    // ------------- Social-aware endpoints -------------

    @Transactional(readOnly = true)
    public List<ReviewCardResponse> findPopularSection(
            Long seriesId, int limit, Long currentUserId) {
        Series series = loadSeries(seriesId);
        List<Long> ids = reviewRepository.findPopularIds(seriesId, limit);
        return loadAndEnrich(series, ids, currentUserId);
    }

    @Transactional(readOnly = true)
    public List<ReviewCardResponse> findRecentSection(
            Long seriesId, int limit, Long currentUserId) {
        Series series = loadSeries(seriesId);
        Page<SeriesReview> page = reviewRepository.findBySeriesId(
                seriesId, PageRequest.of(0, limit));
        List<ReviewCardSource> sources = page.getContent().stream()
                .map(this::toSource).toList();
        return enrichmentService.enrich(ReviewTargetType.SERIES, series.getId(),
                series.getTitle(), series.getImageUrl(), sources, currentUserId);
    }

    @Transactional(readOnly = true)
    public PagedResponse<ReviewCardResponse> findFeed(
            Long seriesId, String sort, Pageable pageable, Long currentUserId) {
        Series series = loadSeries(seriesId);
        // Strip any Sort that Spring Data Web bound from `?sort=` — the repo
        // queries already define their own ORDER BY and appending more breaks them.
        Pageable safe = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        Page<SeriesReview> page = "popular".equalsIgnoreCase(sort)
                ? loadPopularPage(seriesId, safe)
                : reviewRepository.findBySeriesId(seriesId, safe);
        List<ReviewCardSource> sources = page.getContent().stream()
                .map(this::toSource).toList();
        List<ReviewCardResponse> cards = enrichmentService.enrich(
                ReviewTargetType.SERIES, series.getId(), series.getTitle(),
                series.getImageUrl(), sources, currentUserId);
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
        SeriesReview review = reviewRepository.findByIdAndDeletedFalse(reviewId)
                .orElseThrow(() -> new NotFoundException("Review not found"));
        Series series = review.getSeries();
        return enrichmentService.enrichSingle(
                ReviewTargetType.SERIES,
                series.getId(),
                series.getTitle(),
                series.getImageUrl(),
                toSource(review),
                currentUserId
        );
    }

    private Page<SeriesReview> loadPopularPage(Long seriesId, Pageable pageable) {
        Page<Long> idPage = reviewRepository.findPopularIdsPage(seriesId, pageable);
        if (idPage.isEmpty()) {
            return new PageImpl<>(List.of(), pageable, idPage.getTotalElements());
        }
        List<SeriesReview> reviews = reviewRepository.findAllByIdsFetchUser(idPage.getContent());
        Map<Long, SeriesReview> byId = new HashMap<>();
        reviews.forEach(r -> byId.put(r.getId(), r));
        List<SeriesReview> ordered = idPage.getContent().stream()
                .map(byId::get)
                .filter(Objects::nonNull)
                .toList();
        return new PageImpl<>(ordered, pageable, idPage.getTotalElements());
    }

    private List<ReviewCardResponse> loadAndEnrich(
            Series series, List<Long> ids, Long currentUserId) {
        if (ids.isEmpty()) return List.of();
        List<SeriesReview> reviews = reviewRepository.findAllByIdsFetchUser(ids);
        Map<Long, SeriesReview> byId = new HashMap<>();
        reviews.forEach(r -> byId.put(r.getId(), r));
        List<ReviewCardSource> sources = ids.stream()
                .map(byId::get)
                .filter(Objects::nonNull)
                .map(this::toSource)
                .toList();
        return enrichmentService.enrich(ReviewTargetType.SERIES, series.getId(),
                series.getTitle(), series.getImageUrl(), sources, currentUserId);
    }

    private Series loadSeries(Long seriesId) {
        return seriesRepository.findByIdAndDeletedFalse(seriesId)
                .orElseThrow(() -> new NotFoundException("Series not found"));
    }

    private ReviewCardSource toSource(SeriesReview r) {
        User u = r.getUser();
        return new ReviewCardSource(
                r.getId(),
                r.getRating(),
                r.getComment(),
                r.getCreatedAt(),
                r.getUpdatedAt(),
                u.getId(),
                u.getUsername(),
                u.getAvatarUrl()
        );
    }

    // ------------- Mutations -------------

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
        enrichmentService.purgeForReview(ReviewTargetType.SERIES, reviewId);
    }
}
