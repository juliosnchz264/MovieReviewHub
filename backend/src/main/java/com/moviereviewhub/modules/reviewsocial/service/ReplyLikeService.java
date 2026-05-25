package com.moviereviewhub.modules.reviewsocial.service;

import com.moviereviewhub.exception.BadRequestException;
import com.moviereviewhub.exception.NotFoundException;
import com.moviereviewhub.modules.notification.service.event.ReplyLikedEvent;
import com.moviereviewhub.modules.reviewsocial.domain.ReplyLike;
import com.moviereviewhub.modules.reviewsocial.domain.ReviewReply;
import com.moviereviewhub.modules.reviewsocial.dto.ReplyLikeStateResponse;
import com.moviereviewhub.modules.reviewsocial.repository.ReplyLikeRepository;
import com.moviereviewhub.modules.reviewsocial.repository.ReviewReplyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReplyLikeService {

    private final ReplyLikeRepository likeRepository;
    private final ReviewReplyRepository replyRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public ReplyLikeStateResponse like(Long userId, Long replyId) {
        ReviewReply reply = loadActive(replyId);
        Long ownerId = reply.getUser().getId();
        if (ownerId.equals(userId)) {
            throw new BadRequestException("You can't like your own reply");
        }
        boolean inserted = false;
        if (!likeRepository.existsByUserIdAndReplyId(userId, replyId)) {
            try {
                likeRepository.saveAndFlush(ReplyLike.builder()
                        .userId(userId)
                        .replyId(replyId)
                        .build());
                inserted = true;
            } catch (DataIntegrityViolationException ignored) {
                // Concurrent insert won the race — fine, intent satisfied.
            }
        }
        if (inserted) {
            // AFTER_COMMIT push so notification miss can't roll back the like.
            eventPublisher.publishEvent(new ReplyLikedEvent(
                    userId, ownerId, reply.getTargetType(), reply.getTargetId(), replyId
            ));
        }
        return new ReplyLikeStateResponse(
                replyId,
                true,
                likeRepository.countByReplyId(replyId)
        );
    }

    @Transactional
    public ReplyLikeStateResponse unlike(Long userId, Long replyId) {
        // Validate target still exists so caller gets 404 instead of a silent no-op.
        loadActive(replyId);
        likeRepository.deleteByUserIdAndReplyId(userId, replyId);
        return new ReplyLikeStateResponse(
                replyId,
                false,
                likeRepository.countByReplyId(replyId)
        );
    }

    @Transactional(readOnly = true)
    public ReplyLikeStateResponse currentState(Long userId, Long replyId) {
        loadActive(replyId);
        boolean liked = userId != null
                && likeRepository.existsByUserIdAndReplyId(userId, replyId);
        return new ReplyLikeStateResponse(
                replyId,
                liked,
                likeRepository.countByReplyId(replyId)
        );
    }

    private ReviewReply loadActive(Long replyId) {
        return replyRepository.findByIdAndDeletedFalse(replyId)
                .orElseThrow(() -> new NotFoundException("Reply not found"));
    }
}
