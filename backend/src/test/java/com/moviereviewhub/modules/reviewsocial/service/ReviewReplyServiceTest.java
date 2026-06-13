package com.moviereviewhub.modules.reviewsocial.service;

import com.moviereviewhub.exception.BadRequestException;
import com.moviereviewhub.exception.NotFoundException;
import com.moviereviewhub.exception.UnauthorizedException;
import com.moviereviewhub.modules.review.repository.ReviewRepository;
import com.moviereviewhub.modules.reviewsocial.domain.ReviewReply;
import com.moviereviewhub.modules.reviewsocial.domain.ReviewTargetType;
import com.moviereviewhub.modules.reviewsocial.dto.ReviewReplyRequest;
import com.moviereviewhub.modules.reviewsocial.dto.ReviewReplyResponse;
import com.moviereviewhub.modules.reviewsocial.repository.ReplyLikeRepository;
import com.moviereviewhub.modules.reviewsocial.repository.ReviewReplyRepository;
import com.moviereviewhub.modules.seriesreview.repository.SeriesReviewRepository;
import com.moviereviewhub.modules.user.domain.User;
import com.moviereviewhub.modules.user.domain.UserRole;
import com.moviereviewhub.modules.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ReviewReplyServiceTest {

    private ReviewReplyRepository replyRepo;
    private ReplyLikeRepository likeRepo;
    private ReviewRepository reviewRepo;
    private SeriesReviewRepository seriesReviewRepo;
    private UserRepository userRepo;
    private ApplicationEventPublisher events;
    private ReviewReplyService svc;

    @BeforeEach
    void setUp() {
        replyRepo = mock(ReviewReplyRepository.class);
        likeRepo = mock(ReplyLikeRepository.class);
        reviewRepo = mock(ReviewRepository.class);
        seriesReviewRepo = mock(SeriesReviewRepository.class);
        userRepo = mock(UserRepository.class);
        events = mock(ApplicationEventPublisher.class);
        svc = new ReviewReplyService(
                replyRepo, likeRepo, reviewRepo, seriesReviewRepo, userRepo, events);
    }

    @Test
    void topLevelReplyPersistsWithDepthZeroAndNullRoot() {
        stubReviewOwner(MOVIE_REVIEW_ID, 99L);
        stubUser(7L);
        when(replyRepo.save(any(ReviewReply.class))).thenAnswer(i -> {
            ReviewReply r = i.getArgument(0);
            r.setId(1L);
            return r;
        });

        ReviewReplyResponse res = svc.create(7L, ReviewTargetType.MOVIE, MOVIE_REVIEW_ID,
                new ReviewReplyRequest("hello", null));

        ArgumentCaptor<ReviewReply> captor = ArgumentCaptor.forClass(ReviewReply.class);
        verify(replyRepo).save(captor.capture());
        ReviewReply saved = captor.getValue();
        assertThat(saved.getDepth()).isEqualTo((short) 0);
        assertThat(saved.getParentReplyId()).isNull();
        assertThat(saved.getRootReplyId()).isNull();
        assertThat(res.id()).isEqualTo(1L);
    }

    @Test
    void nestedReplyInheritsRootAndIncrementsDepth() {
        stubReviewOwner(MOVIE_REVIEW_ID, 99L);
        stubUser(7L);
        ReviewReply parent = buildReply(50L, 8L, (short) 0, null);
        when(replyRepo.findByIdAndDeletedFalse(50L)).thenReturn(Optional.of(parent));
        when(replyRepo.save(any(ReviewReply.class))).thenAnswer(i -> {
            ReviewReply r = i.getArgument(0);
            r.setId(60L);
            return r;
        });

        svc.create(7L, ReviewTargetType.MOVIE, MOVIE_REVIEW_ID,
                new ReviewReplyRequest("nested", 50L));

        ArgumentCaptor<ReviewReply> captor = ArgumentCaptor.forClass(ReviewReply.class);
        verify(replyRepo).save(captor.capture());
        ReviewReply saved = captor.getValue();
        assertThat(saved.getDepth()).isEqualTo((short) 1);
        // Root reply is the parent itself (parent had no rootReplyId).
        assertThat(saved.getRootReplyId()).isEqualTo(50L);
    }

    @Test
    void nestedUnderDescendantInheritsExistingRoot() {
        stubReviewOwner(MOVIE_REVIEW_ID, 99L);
        stubUser(7L);
        ReviewReply parent = buildReply(80L, 8L, (short) 1, 50L);
        when(replyRepo.findByIdAndDeletedFalse(80L)).thenReturn(Optional.of(parent));
        when(replyRepo.save(any(ReviewReply.class))).thenAnswer(i -> i.getArgument(0));

        svc.create(7L, ReviewTargetType.MOVIE, MOVIE_REVIEW_ID,
                new ReviewReplyRequest("deeper", 80L));

        ArgumentCaptor<ReviewReply> captor = ArgumentCaptor.forClass(ReviewReply.class);
        verify(replyRepo).save(captor.capture());
        assertThat(captor.getValue().getRootReplyId()).isEqualTo(50L);
        assertThat(captor.getValue().getDepth()).isEqualTo((short) 2);
    }

    @Test
    void depthCapEnforced() {
        stubReviewOwner(MOVIE_REVIEW_ID, 99L);
        stubUser(7L);
        ReviewReply parent = buildReply(80L, 8L, (short) 3, 50L);
        when(replyRepo.findByIdAndDeletedFalse(80L)).thenReturn(Optional.of(parent));

        assertThatThrownBy(() -> svc.create(7L, ReviewTargetType.MOVIE, MOVIE_REVIEW_ID,
                new ReviewReplyRequest("too deep", 80L)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("too deeply nested");
        verify(replyRepo, never()).save(any());
    }

    @Test
    void parentBelongsToDifferentReviewIsRejected() {
        stubReviewOwner(MOVIE_REVIEW_ID, 99L);
        stubUser(7L);
        ReviewReply parent = buildReply(80L, 8L, (short) 0, null);
        parent.setTargetId(999L); // wrong review
        when(replyRepo.findByIdAndDeletedFalse(80L)).thenReturn(Optional.of(parent));

        assertThatThrownBy(() -> svc.create(7L, ReviewTargetType.MOVIE, MOVIE_REVIEW_ID,
                new ReviewReplyRequest("mismatched", 80L)))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void replyOnMissingReviewYields404() {
        when(reviewRepo.findOwnerIdById(MOVIE_REVIEW_ID)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> svc.create(7L, ReviewTargetType.MOVIE, MOVIE_REVIEW_ID,
                new ReviewReplyRequest("hi", null)))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void updateRefusesNonOwner() {
        ReviewReply reply = buildReply(80L, 8L, (short) 0, null);
        when(replyRepo.findByIdAndDeletedFalse(80L)).thenReturn(Optional.of(reply));

        assertThatThrownBy(() -> svc.update(80L, 99L, new ReviewReplyRequest("new")))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void deleteByAdminAllowed() {
        ReviewReply reply = buildReply(80L, 8L, (short) 0, null);
        when(replyRepo.findByIdAndDeletedFalse(80L)).thenReturn(Optional.of(reply));

        svc.delete(80L, 99L, UserRole.ROLE_ADMIN);

        assertThat(reply.isDeleted()).isTrue();
        verify(replyRepo).save(reply);
    }

    @Test
    void deleteByNonOwnerNonAdminRejected() {
        ReviewReply reply = buildReply(80L, 8L, (short) 0, null);
        when(replyRepo.findByIdAndDeletedFalse(80L)).thenReturn(Optional.of(reply));

        assertThatThrownBy(() -> svc.delete(80L, 99L, UserRole.ROLE_USER))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void deleteByOwnerSoftDeletes() {
        ReviewReply reply = buildReply(80L, 8L, (short) 0, null);
        when(replyRepo.findByIdAndDeletedFalse(80L)).thenReturn(Optional.of(reply));
        when(likeRepo.countLikesGrouped(any())).thenReturn(List.of());
        when(replyRepo.countDirectChildrenGrouped(any())).thenReturn(List.of());

        svc.delete(80L, 8L, UserRole.ROLE_USER);

        assertThat(reply.isDeleted()).isTrue();
    }

    // ---------- helpers ----------

    private static final Long MOVIE_REVIEW_ID = 100L;

    private void stubReviewOwner(Long reviewId, Long ownerId) {
        when(reviewRepo.findOwnerIdById(reviewId)).thenReturn(Optional.of(ownerId));
    }

    private void stubUser(Long id) {
        User u = new User();
        u.setId(id);
        when(userRepo.findById(id)).thenReturn(Optional.of(u));
    }

    private static ReviewReply buildReply(Long id, Long userId, short depth, Long rootId) {
        User author = new User();
        author.setId(userId);
        ReviewReply r = ReviewReply.builder()
                .user(author)
                .targetType(ReviewTargetType.MOVIE)
                .targetId(MOVIE_REVIEW_ID)
                .depth(depth)
                .rootReplyId(rootId)
                .body("body")
                .build();
        r.setId(id);
        return r;
    }
}
