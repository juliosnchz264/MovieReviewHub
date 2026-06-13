package com.moviereviewhub.modules.reviewsocial.service;

import com.moviereviewhub.exception.BadRequestException;
import com.moviereviewhub.exception.NotFoundException;
import com.moviereviewhub.modules.notification.service.event.ReviewLikedEvent;
import com.moviereviewhub.modules.review.repository.ReviewRepository;
import com.moviereviewhub.modules.reviewsocial.domain.ReviewLike;
import com.moviereviewhub.modules.reviewsocial.domain.ReviewTargetType;
import com.moviereviewhub.modules.reviewsocial.dto.LikeStateResponse;
import com.moviereviewhub.modules.reviewsocial.repository.ReviewLikeRepository;
import com.moviereviewhub.modules.seriesreview.repository.SeriesReviewRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ReviewLikeServiceTest {

    private ReviewLikeRepository likes;
    private ReviewRepository reviews;
    private SeriesReviewRepository seriesReviews;
    private ApplicationEventPublisher events;
    private ReviewLikeService svc;

    @BeforeEach
    void setUp() {
        likes = mock(ReviewLikeRepository.class);
        reviews = mock(ReviewRepository.class);
        seriesReviews = mock(SeriesReviewRepository.class);
        events = mock(ApplicationEventPublisher.class);
        svc = new ReviewLikeService(likes, reviews, seriesReviews, events);
    }

    @Test
    void likeOwnReviewIsRejected() {
        when(reviews.findOwnerIdById(10L)).thenReturn(Optional.of(7L));
        assertThatThrownBy(() -> svc.like(7L, ReviewTargetType.MOVIE, 10L))
                .isInstanceOf(BadRequestException.class);
        verify(likes, never()).saveAndFlush(any());
        verify(events, never()).publishEvent(any());
    }

    @Test
    void likeMissingTargetThrowsNotFound() {
        when(reviews.findOwnerIdById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> svc.like(1L, ReviewTargetType.MOVIE, 99L))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void likeIsIdempotent_secondCallDoesNotInsertOrPublish() {
        when(reviews.findOwnerIdById(10L)).thenReturn(Optional.of(99L));
        when(likes.existsByUserIdAndTargetTypeAndTargetId(1L, ReviewTargetType.MOVIE, 10L))
                .thenReturn(true);
        when(likes.countByTargetTypeAndTargetId(ReviewTargetType.MOVIE, 10L)).thenReturn(5L);

        LikeStateResponse res = svc.like(1L, ReviewTargetType.MOVIE, 10L);

        assertThat(res.likedByMe()).isTrue();
        assertThat(res.likeCount()).isEqualTo(5L);
        verify(likes, never()).saveAndFlush(any());
        verify(events, never()).publishEvent(any());
    }

    @Test
    void firstLikePublishesNotificationEvent() {
        when(reviews.findOwnerIdById(10L)).thenReturn(Optional.of(99L));
        when(likes.existsByUserIdAndTargetTypeAndTargetId(1L, ReviewTargetType.MOVIE, 10L))
                .thenReturn(false);
        when(likes.countByTargetTypeAndTargetId(ReviewTargetType.MOVIE, 10L)).thenReturn(1L);

        LikeStateResponse res = svc.like(1L, ReviewTargetType.MOVIE, 10L);

        assertThat(res.likedByMe()).isTrue();
        verify(likes, times(1)).saveAndFlush(any(ReviewLike.class));
        verify(events, times(1)).publishEvent(any(ReviewLikedEvent.class));
    }

    @Test
    void raceConditionInsertIsSwallowedAsSuccess() {
        when(reviews.findOwnerIdById(10L)).thenReturn(Optional.of(99L));
        when(likes.existsByUserIdAndTargetTypeAndTargetId(1L, ReviewTargetType.MOVIE, 10L))
                .thenReturn(false);
        when(likes.saveAndFlush(any(ReviewLike.class)))
                .thenThrow(new DataIntegrityViolationException("unique violation"));
        when(likes.countByTargetTypeAndTargetId(ReviewTargetType.MOVIE, 10L)).thenReturn(1L);

        LikeStateResponse res = svc.like(1L, ReviewTargetType.MOVIE, 10L);

        assertThat(res.likedByMe()).isTrue();
        // Concurrent peer inserted before us — we don't publish the notification
        // again from this thread.
        verify(events, never()).publishEvent(any());
    }

    @Test
    void unlikeOnMissingTargetThrowsNotFound() {
        when(reviews.findOwnerIdById(404L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> svc.unlike(1L, ReviewTargetType.MOVIE, 404L))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void unlikeIsIdempotent_callsRepoUnconditionally() {
        when(reviews.findOwnerIdById(10L)).thenReturn(Optional.of(99L));
        when(likes.countByTargetTypeAndTargetId(ReviewTargetType.MOVIE, 10L)).thenReturn(0L);

        LikeStateResponse res = svc.unlike(1L, ReviewTargetType.MOVIE, 10L);

        assertThat(res.likedByMe()).isFalse();
        assertThat(res.likeCount()).isZero();
        verify(likes).deleteByUserIdAndTargetTypeAndTargetId(1L, ReviewTargetType.MOVIE, 10L);
    }

    @Test
    void currentStateForAnonymousReportsLikedFalseWithCount() {
        when(reviews.findOwnerIdById(10L)).thenReturn(Optional.of(99L));
        when(likes.countByTargetTypeAndTargetId(ReviewTargetType.MOVIE, 10L)).thenReturn(3L);

        LikeStateResponse res = svc.currentState(null, ReviewTargetType.MOVIE, 10L);

        assertThat(res.likedByMe()).isFalse();
        assertThat(res.likeCount()).isEqualTo(3L);
        verify(likes, never()).existsByUserIdAndTargetTypeAndTargetId(any(), any(), any());
    }

    @Test
    void seriesPathResolvesViaSeriesRepository() {
        when(seriesReviews.findOwnerIdById(10L)).thenReturn(Optional.of(99L));
        when(likes.existsByUserIdAndTargetTypeAndTargetId(1L, ReviewTargetType.SERIES, 10L))
                .thenReturn(false);
        when(likes.countByTargetTypeAndTargetId(ReviewTargetType.SERIES, 10L)).thenReturn(1L);

        svc.like(1L, ReviewTargetType.SERIES, 10L);

        verify(seriesReviews).findOwnerIdById(10L);
        verify(reviews, never()).findOwnerIdById(any());
    }
}
