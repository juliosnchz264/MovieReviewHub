package com.moviereviewhub.modules.reviewsocial.service;

import com.moviereviewhub.common.dto.PagedResponse;
import com.moviereviewhub.exception.NotFoundException;
import com.moviereviewhub.exception.UnauthorizedException;
import com.moviereviewhub.modules.review.repository.ReviewRepository;
import com.moviereviewhub.modules.reviewsocial.domain.ReviewReply;
import com.moviereviewhub.modules.reviewsocial.domain.ReviewTargetType;
import com.moviereviewhub.modules.reviewsocial.dto.ReviewReplyRequest;
import com.moviereviewhub.modules.reviewsocial.dto.ReviewReplyResponse;
import com.moviereviewhub.modules.reviewsocial.repository.ReviewReplyRepository;
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
public class ReviewReplyService {

    private final ReviewReplyRepository replyRepository;
    private final ReviewRepository reviewRepository;
    private final SeriesReviewRepository seriesReviewRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public PagedResponse<ReviewReplyResponse> list(
            ReviewTargetType type, Long reviewId, Long currentUserId,
            UserRole currentRole, Pageable pageable) {
        ensureReviewExists(type, reviewId);
        Page<ReviewReply> page = replyRepository.findActiveByTarget(type, reviewId, pageable);
        boolean isAdmin = currentRole == UserRole.ROLE_ADMIN;
        return PagedResponse.from(page, r -> ReviewReplyResponse.from(r, currentUserId, isAdmin));
    }

    @Transactional
    public ReviewReplyResponse create(
            Long userId, ReviewTargetType type, Long reviewId, ReviewReplyRequest req) {
        ensureReviewExists(type, reviewId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        ReviewReply reply = ReviewReply.builder()
                .user(user)
                .targetType(type)
                .targetId(reviewId)
                .body(req.body().trim())
                .build();
        return ReviewReplyResponse.from(replyRepository.save(reply), userId, false);
    }

    @Transactional
    public ReviewReplyResponse update(Long replyId, Long userId, ReviewReplyRequest req) {
        ReviewReply reply = replyRepository.findByIdAndDeletedFalse(replyId)
                .orElseThrow(() -> new NotFoundException("Reply not found"));
        if (!reply.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("You can only edit your own reply");
        }
        reply.setBody(req.body().trim());
        return ReviewReplyResponse.from(replyRepository.save(reply), userId, false);
    }

    @Transactional
    public void delete(Long replyId, Long userId, UserRole role) {
        ReviewReply reply = replyRepository.findByIdAndDeletedFalse(replyId)
                .orElseThrow(() -> new NotFoundException("Reply not found"));
        boolean isOwner = reply.getUser().getId().equals(userId);
        boolean isAdmin = role == UserRole.ROLE_ADMIN;
        if (!isOwner && !isAdmin) {
            throw new UnauthorizedException("Cannot delete this reply");
        }
        reply.setDeleted(true);
        replyRepository.save(reply);
    }

    private void ensureReviewExists(ReviewTargetType type, Long reviewId) {
        boolean exists = switch (type) {
            case MOVIE -> reviewRepository.findOwnerIdById(reviewId).isPresent();
            case SERIES -> seriesReviewRepository.findOwnerIdById(reviewId).isPresent();
        };
        if (!exists) {
            throw new NotFoundException("Review not found");
        }
    }
}
