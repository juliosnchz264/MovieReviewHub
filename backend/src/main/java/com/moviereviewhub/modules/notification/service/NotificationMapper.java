package com.moviereviewhub.modules.notification.service;

import com.moviereviewhub.common.dto.PagedResponse;
import com.moviereviewhub.modules.notification.domain.Notification;
import com.moviereviewhub.modules.notification.domain.NotificationTargetType;
import com.moviereviewhub.modules.notification.dto.NotificationActorSnippet;
import com.moviereviewhub.modules.notification.dto.NotificationResponse;
import com.moviereviewhub.modules.notification.dto.NotificationTargetSnippet;
import com.moviereviewhub.modules.review.domain.Review;
import com.moviereviewhub.modules.review.repository.ReviewRepository;
import com.moviereviewhub.modules.reviewsocial.domain.ReviewReply;
import com.moviereviewhub.modules.reviewsocial.repository.ReviewReplyRepository;
import com.moviereviewhub.modules.seriesreview.domain.SeriesReview;
import com.moviereviewhub.modules.seriesreview.repository.SeriesReviewRepository;
import com.moviereviewhub.modules.user.domain.User;
import com.moviereviewhub.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Batch-hydrates a Page<Notification> into a PagedResponse<NotificationResponse>.
 * Strategy: collect all referenced ids first (actors, last actors, target reviews,
 * context reviews, target replies), then issue one bulk query per dependency
 * type. Per-notification assembly is then pure map lookup, so cost stays
 * O(1) per row instead of O(N) per row.
 */
@Component
@RequiredArgsConstructor
public class NotificationMapper {

    private static final int PREVIEW_MAX = 200;

    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;
    private final SeriesReviewRepository seriesReviewRepository;
    private final ReviewReplyRepository replyRepository;

    public PagedResponse<NotificationResponse> mapPage(Page<Notification> page) {
        List<NotificationResponse> content = mapAll(page.getContent());
        return new PagedResponse<>(
                content,
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isFirst(),
                page.isLast()
        );
    }

    public List<NotificationResponse> mapAll(List<Notification> notifications) {
        if (notifications.isEmpty()) return List.of();
        HydrationContext ctx = hydrate(notifications);
        return notifications.stream().map(n -> assemble(n, ctx)).toList();
    }

    public NotificationResponse mapOne(Notification n) {
        HydrationContext ctx = hydrate(List.of(n));
        return assemble(n, ctx);
    }

    // ---------------- assembly ----------------

    private NotificationResponse assemble(Notification n, HydrationContext ctx) {
        NotificationActorSnippet actor = actorSnippet(
                n.getLastActorId() != null ? n.getLastActorId() : n.getActorId(),
                ctx.users
        );
        NotificationTargetSnippet target = buildTarget(n, ctx);
        return new NotificationResponse(
                n.getId(),
                n.getType(),
                actor,
                n.getGroupCount(),
                target,
                n.getReadAt() != null,
                n.getSeenAt() != null,
                n.getCreatedAt(),
                n.getUpdatedAt()
        );
    }

    private NotificationActorSnippet actorSnippet(Long userId, Map<Long, User> users) {
        if (userId == null) return null;
        User u = users.get(userId);
        if (u == null) return null;
        return new NotificationActorSnippet(u.getId(), u.getUsername(), u.getAvatarUrl());
    }

    private NotificationTargetSnippet buildTarget(Notification n, HydrationContext ctx) {
        NotificationTargetType targetType = n.getTargetType();
        if (targetType == null || n.getTargetId() == null) return null;

        return switch (targetType) {
            case REVIEW_MOVIE -> movieReviewSnippet(n.getTargetId(), ctx);
            case REVIEW_SERIES -> seriesReviewSnippet(n.getTargetId(), ctx);
            case REPLY -> replySnippet(n, ctx);
        };
    }

    private NotificationTargetSnippet movieReviewSnippet(Long reviewId, HydrationContext ctx) {
        Review r = ctx.movieReviews.get(reviewId);
        if (r == null) {
            return new NotificationTargetSnippet(
                    NotificationTargetType.REVIEW_MOVIE, reviewId, null, null, null, null, null);
        }
        return new NotificationTargetSnippet(
                NotificationTargetType.REVIEW_MOVIE,
                reviewId,
                null,
                null,
                r.getMovie() != null ? r.getMovie().getTitle() : null,
                r.getMovie() != null ? r.getMovie().getImageUrl() : null,
                null
        );
    }

    private NotificationTargetSnippet seriesReviewSnippet(Long reviewId, HydrationContext ctx) {
        SeriesReview r = ctx.seriesReviews.get(reviewId);
        if (r == null) {
            return new NotificationTargetSnippet(
                    NotificationTargetType.REVIEW_SERIES, reviewId, null, null, null, null, null);
        }
        return new NotificationTargetSnippet(
                NotificationTargetType.REVIEW_SERIES,
                reviewId,
                null,
                null,
                r.getSeries() != null ? r.getSeries().getTitle() : null,
                r.getSeries() != null ? r.getSeries().getImageUrl() : null,
                null
        );
    }

    private NotificationTargetSnippet replySnippet(Notification n, HydrationContext ctx) {
        ReviewReply reply = ctx.replies.get(n.getTargetId());
        String preview = (reply == null || reply.isDeleted())
                ? null
                : trim(reply.getBody());

        NotificationTargetType parentKind = n.getContextType();
        Long parentId = n.getContextId();
        String title = null;
        String poster = null;

        if (parentKind == NotificationTargetType.REVIEW_MOVIE && parentId != null) {
            Review parent = ctx.movieReviews.get(parentId);
            if (parent != null && parent.getMovie() != null) {
                title = parent.getMovie().getTitle();
                poster = parent.getMovie().getImageUrl();
            }
        } else if (parentKind == NotificationTargetType.REVIEW_SERIES && parentId != null) {
            SeriesReview parent = ctx.seriesReviews.get(parentId);
            if (parent != null && parent.getSeries() != null) {
                title = parent.getSeries().getTitle();
                poster = parent.getSeries().getImageUrl();
            }
        }

        return new NotificationTargetSnippet(
                NotificationTargetType.REPLY,
                n.getTargetId(),
                parentKind,
                parentId,
                title,
                poster,
                preview
        );
    }

    private static String trim(String body) {
        if (body == null) return null;
        if (body.length() <= PREVIEW_MAX) return body;
        return body.substring(0, PREVIEW_MAX);
    }

    // ---------------- hydration ----------------

    private HydrationContext hydrate(List<Notification> notifications) {
        Set<Long> userIds = new HashSet<>();
        Set<Long> movieReviewIds = new HashSet<>();
        Set<Long> seriesReviewIds = new HashSet<>();
        Set<Long> replyIds = new HashSet<>();

        for (Notification n : notifications) {
            if (n.getActorId() != null) userIds.add(n.getActorId());
            if (n.getLastActorId() != null) userIds.add(n.getLastActorId());
            collectTargetIds(n.getTargetType(), n.getTargetId(),
                    movieReviewIds, seriesReviewIds, replyIds);
            collectTargetIds(n.getContextType(), n.getContextId(),
                    movieReviewIds, seriesReviewIds, replyIds);
        }

        Map<Long, User> users = mapById(loadUsers(userIds), User::getId);
        Map<Long, Review> movieReviews = mapById(loadMovieReviews(movieReviewIds), Review::getId);
        Map<Long, SeriesReview> seriesReviews = mapById(
                loadSeriesReviews(seriesReviewIds), SeriesReview::getId);
        Map<Long, ReviewReply> replies = mapById(loadReplies(replyIds), ReviewReply::getId);

        return new HydrationContext(users, movieReviews, seriesReviews, replies);
    }

    private static void collectTargetIds(
            NotificationTargetType type, Long id,
            Set<Long> movieReviewIds, Set<Long> seriesReviewIds, Set<Long> replyIds) {
        if (type == null || id == null) return;
        switch (type) {
            case REVIEW_MOVIE -> movieReviewIds.add(id);
            case REVIEW_SERIES -> seriesReviewIds.add(id);
            case REPLY -> replyIds.add(id);
        }
    }

    private List<User> loadUsers(Collection<Long> ids) {
        return ids.isEmpty() ? List.of() : userRepository.findAllById(ids);
    }

    private List<Review> loadMovieReviews(Collection<Long> ids) {
        return ids.isEmpty()
                ? List.of()
                : reviewRepository.findAllByIdsFetchMovieIncludingDeleted(ids);
    }

    private List<SeriesReview> loadSeriesReviews(Collection<Long> ids) {
        return ids.isEmpty()
                ? List.of()
                : seriesReviewRepository.findAllByIdsFetchSeriesIncludingDeleted(ids);
    }

    private List<ReviewReply> loadReplies(Collection<Long> ids) {
        return ids.isEmpty()
                ? List.of()
                : replyRepository.findAllByIdsIncludingDeleted(ids);
    }

    private static <K, V> Map<K, V> mapById(List<V> list, java.util.function.Function<V, K> keyFn) {
        Map<K, V> map = new HashMap<>(list.size() * 2);
        for (V v : list) map.put(keyFn.apply(v), v);
        return map;
    }

    private record HydrationContext(
            Map<Long, User> users,
            Map<Long, Review> movieReviews,
            Map<Long, SeriesReview> seriesReviews,
            Map<Long, ReviewReply> replies
    ) {
    }
}
