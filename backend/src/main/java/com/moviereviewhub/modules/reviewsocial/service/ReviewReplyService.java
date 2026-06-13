package com.moviereviewhub.modules.reviewsocial.service;

import com.moviereviewhub.common.dto.PagedResponse;
import com.moviereviewhub.exception.BadRequestException;
import com.moviereviewhub.exception.NotFoundException;
import com.moviereviewhub.exception.UnauthorizedException;
import com.moviereviewhub.modules.notification.service.event.ReplyAnsweredEvent;
import com.moviereviewhub.modules.notification.service.event.ReplyDeletedEvent;
import com.moviereviewhub.modules.notification.service.event.ReviewRepliedEvent;
import com.moviereviewhub.modules.notification.service.event.ThreadActivityEvent;
import com.moviereviewhub.modules.review.repository.ReviewRepository;
import com.moviereviewhub.modules.reviewsocial.domain.ReviewReply;
import com.moviereviewhub.modules.reviewsocial.domain.ReviewTargetType;
import com.moviereviewhub.modules.reviewsocial.dto.ReviewReplyRequest;
import com.moviereviewhub.modules.reviewsocial.dto.ReviewReplyResponse;
import com.moviereviewhub.modules.reviewsocial.dto.TargetCountRow;
import com.moviereviewhub.modules.reviewsocial.repository.ReplyLikeRepository;
import com.moviereviewhub.modules.reviewsocial.repository.ReviewReplyRepository;
import com.moviereviewhub.modules.seriesreview.repository.SeriesReviewRepository;
import com.moviereviewhub.modules.user.domain.User;
import com.moviereviewhub.modules.user.domain.UserRole;
import com.moviereviewhub.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ReviewReplyService {

    private static final int PREVIEW_LENGTH = 140;
    /**
     * Maximum nesting level allowed. 0 = top-level. Past 3, indentation
     * makes the UI unreadable and conversations turn into spam threads.
     * Matches the DB CHECK constraint added in V16.
     */
    static final short MAX_DEPTH = 3;

    private final ReviewReplyRepository replyRepository;
    private final ReplyLikeRepository replyLikeRepository;
    private final ReviewRepository reviewRepository;
    private final SeriesReviewRepository seriesReviewRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Top-level replies only. Threaded UI paginates roots; descendants are
     * loaded on demand via {@link #loadThread}.
     */
    @Transactional(readOnly = true)
    public PagedResponse<ReviewReplyResponse> list(
            ReviewTargetType type, Long reviewId, Long currentUserId,
            UserRole currentRole, Pageable pageable) {
        ensureReviewExists(type, reviewId);
        Page<ReviewReply> page = replyRepository.findTopLevelByTarget(type, reviewId, pageable);
        return new PagedResponse<>(
                enrich(page.getContent(), currentUserId, currentRole),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isFirst(),
                page.isLast()
        );
    }

    /**
     * Direct children of a reply, paginated. Powers the Reddit-style lazy
     * expansion: opening a node fetches only its immediate children, so the
     * frontend never renders an entire subtree at once.
     */
    @Transactional(readOnly = true)
    public PagedResponse<ReviewReplyResponse> listChildren(
            Long parentId, Long currentUserId, UserRole currentRole, Pageable pageable) {
        replyRepository.findByIdAndDeletedFalse(parentId)
                .orElseThrow(() -> new NotFoundException("Parent reply not found"));
        Page<ReviewReply> page = replyRepository.findActiveChildren(parentId, pageable);
        return new PagedResponse<>(
                enrich(page.getContent(), currentUserId, currentRole),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isFirst(),
                page.isLast()
        );
    }

    /**
     * Ancestry chain for a reply: ordered list from the root down to (and
     * including) the target. Used by deep-link rehydration so the frontend
     * can pre-populate children caches along the path and auto-expand each
     * node leading to the target reply.
     *
     * Walks the parent chain step by step. Depth is bounded by
     * {@link #MAX_DEPTH}, so this issues at most {@code MAX_DEPTH + 1}
     * queries — acceptable, and avoids loading the full thread when only
     * the chain is needed.
     */
    @Transactional(readOnly = true)
    public List<ReviewReplyResponse> loadAncestry(
            Long replyId, Long currentUserId, UserRole currentRole) {
        Deque<ReviewReply> chain = new ArrayDeque<>();
        ReviewReply current = replyRepository.findByIdAndDeletedFalseWithUser(replyId)
                .orElseThrow(() -> new NotFoundException("Reply not found"));
        chain.addFirst(current);
        int safety = MAX_DEPTH + 2;
        while (current.getParentReplyId() != null && safety-- > 0) {
            current = replyRepository
                    .findByIdAndDeletedFalseWithUser(current.getParentReplyId())
                    .orElseThrow(() -> new NotFoundException("Ancestor not found"));
            chain.addFirst(current);
        }
        return enrich(new ArrayList<>(chain), currentUserId, currentRole);
    }

    /**
     * Load every active reply in the thread anchored at {@code rootReplyId},
     * including the root itself. The frontend reconstructs the tree using
     * {@code parentReplyId}. Single batched query plus the standard
     * engagement enrichment.
     */
    @Transactional(readOnly = true)
    public List<ReviewReplyResponse> loadThread(
            Long rootReplyId, Long currentUserId, UserRole currentRole) {
        // Validate root exists and is a top-level reply.
        ReviewReply root = replyRepository.findByIdAndDeletedFalse(rootReplyId)
                .orElseThrow(() -> new NotFoundException("Reply not found"));
        if (root.getParentReplyId() != null) {
            throw new BadRequestException("Thread root must be a top-level reply");
        }
        List<ReviewReply> thread = replyRepository.findThreadByRoot(rootReplyId);
        return enrich(thread, currentUserId, currentRole);
    }

    private List<ReviewReplyResponse> enrich(
            List<ReviewReply> replies, Long currentUserId, UserRole role) {
        if (replies.isEmpty()) return List.of();
        boolean isAdmin = role == UserRole.ROLE_ADMIN;
        List<Long> ids = replies.stream().map(ReviewReply::getId).toList();
        Map<Long, Long> likeCounts = batchLikeCounts(ids);
        Set<Long> likedByMe = batchLikedByMe(currentUserId, ids);
        Map<Long, Integer> childCounts = batchChildCounts(ids);

        return replies.stream()
                .map(r -> ReviewReplyResponse.from(
                        r,
                        currentUserId,
                        isAdmin,
                        likeCounts.getOrDefault(r.getId(), 0L),
                        likedByMe.contains(r.getId()),
                        childCounts.getOrDefault(r.getId(), 0)
                ))
                .toList();
    }

    private Map<Long, Long> batchLikeCounts(List<Long> replyIds) {
        if (replyIds.isEmpty()) return Map.of();
        Map<Long, Long> map = new HashMap<>(replyIds.size() * 2);
        for (TargetCountRow row : replyLikeRepository.countLikesGrouped(replyIds)) {
            map.put(row.targetId(), row.count());
        }
        return map;
    }

    private Set<Long> batchLikedByMe(Long userId, List<Long> replyIds) {
        if (userId == null || replyIds.isEmpty()) return Set.of();
        return new HashSet<>(replyLikeRepository.findLikedReplyIds(userId, replyIds));
    }

    private Map<Long, Integer> batchChildCounts(List<Long> replyIds) {
        if (replyIds.isEmpty()) return Map.of();
        Map<Long, Integer> map = new HashMap<>(replyIds.size() * 2);
        for (TargetCountRow row : replyRepository.countDirectChildrenGrouped(replyIds)) {
            map.put(row.targetId(), row.count().intValue());
        }
        return map;
    }

    @Transactional
    public ReviewReplyResponse create(
            Long userId, ReviewTargetType type, Long reviewId, ReviewReplyRequest req) {
        Long ownerId = resolveOwnerId(type, reviewId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        String body = req.body().trim();
        Long parentReplyId = req.parentReplyId();

        Long parentAuthorId = null;
        short newDepth = 0;
        Long rootReplyId = null;

        if (parentReplyId != null) {
            ReviewReply parent = replyRepository.findByIdAndDeletedFalse(parentReplyId)
                    .orElseThrow(() -> new NotFoundException("Parent reply not found"));
            if (parent.getTargetType() != type || !parent.getTargetId().equals(reviewId)) {
                throw new BadRequestException("Parent reply does not belong to this review");
            }
            short parentDepth = parent.getDepth() == null ? 0 : parent.getDepth();
            if (parentDepth + 1 > MAX_DEPTH) {
                throw new BadRequestException("Reply is too deeply nested");
            }
            parentAuthorId = parent.getUser().getId();
            newDepth = (short) (parentDepth + 1);
            // Parent is either the root itself (rootReplyId NULL → use parent.id)
            // or already a descendant (inherit its rootReplyId).
            rootReplyId = parent.getRootReplyId() != null
                    ? parent.getRootReplyId()
                    : parent.getId();
        }

        ReviewReply reply = ReviewReply.builder()
                .user(user)
                .targetType(type)
                .targetId(reviewId)
                .parentReplyId(parentReplyId)
                .depth(newDepth)
                .rootReplyId(rootReplyId)
                .body(body)
                .build();
        ReviewReply saved = replyRepository.save(reply);

        // Route notification: nested reply → notify the parent reply's author;
        // top-level reply → notify the review author (existing behaviour).
        // Both fire AFTER_COMMIT so failure cannot roll back the reply.
        Long primaryRecipient = null;
        if (parentReplyId != null && parentAuthorId != null && !parentAuthorId.equals(userId)) {
            eventPublisher.publishEvent(new ReplyAnsweredEvent(
                    userId, parentAuthorId, type, reviewId,
                    parentReplyId, saved.getId(), preview(body)
            ));
            primaryRecipient = parentAuthorId;
        } else if (parentReplyId == null && !ownerId.equals(userId)) {
            eventPublisher.publishEvent(new ReviewRepliedEvent(
                    userId, ownerId, type, reviewId, saved.getId(), preview(body)
            ));
            primaryRecipient = ownerId;
        }

        // Fan-out THREAD_ACTIVITY only to participants of the SAME branch
        // (sharing root_reply_id), not every commenter on the review. Roots
        // have no branch yet, so they trigger no fan-out. Recipients excluded:
        //   - the actor (can't notify yourself),
        //   - the review author (already notified via REVIEW_REPLIED, or is
        //     the actor on their own review),
        //   - the recipient of the primary REVIEW_REPLIED / REPLY_ANSWERED
        //     event (avoid double-pings on the same action).
        publishThreadActivity(saved, type, reviewId, userId, ownerId, primaryRecipient, body);

        return ReviewReplyResponse.from(saved, userId, false);
    }

    private void publishThreadActivity(
            ReviewReply newReply, ReviewTargetType type, Long reviewId,
            Long actorId, Long reviewOwnerId, Long primaryRecipient, String body) {
        Long rootId = newReply.getRootReplyId();
        if (rootId == null) return; // top-level reply: no branch to fan out to
        List<Long> participants = replyRepository.findBranchParticipantIds(rootId);
        if (participants.isEmpty()) return;
        Set<Long> recipients = new HashSet<>(participants);
        recipients.remove(actorId);
        recipients.remove(reviewOwnerId);
        if (primaryRecipient != null) recipients.remove(primaryRecipient);
        if (recipients.isEmpty()) return;
        eventPublisher.publishEvent(new ThreadActivityEvent(
                actorId, recipients, type, reviewId, newReply.getId(), preview(body)
        ));
    }

    @Transactional
    public ReviewReplyResponse update(Long replyId, Long userId, ReviewReplyRequest req) {
        ReviewReply reply = replyRepository.findByIdAndDeletedFalse(replyId)
                .orElseThrow(() -> new NotFoundException("Reply not found"));
        if (!reply.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("You can only edit your own reply");
        }
        reply.setBody(req.body().trim());
        ReviewReply saved = replyRepository.save(reply);
        // Preserve engagement state across edit so the UI does not flash "0 likes".
        long likeCount = replyLikeRepository.countByReplyId(saved.getId());
        boolean likedByMe = replyLikeRepository.existsByUserIdAndReplyId(userId, saved.getId());
        int childCount = batchChildCounts(List.of(saved.getId()))
                .getOrDefault(saved.getId(), 0);
        return ReviewReplyResponse.from(saved, userId, false, likeCount, likedByMe, childCount);
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
        // Drop any pending notifications pointing at this reply so the bell
        // does not surface a tombstone.
        eventPublisher.publishEvent(new ReplyDeletedEvent(replyId));
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

    private Long resolveOwnerId(ReviewTargetType type, Long reviewId) {
        Optional<Long> owner = switch (type) {
            case MOVIE -> reviewRepository.findOwnerIdById(reviewId);
            case SERIES -> seriesReviewRepository.findOwnerIdById(reviewId);
        };
        return owner.orElseThrow(() -> new NotFoundException("Review not found"));
    }

    private static String preview(String body) {
        if (body == null) return "";
        return body.length() <= PREVIEW_LENGTH ? body : body.substring(0, PREVIEW_LENGTH);
    }
}
