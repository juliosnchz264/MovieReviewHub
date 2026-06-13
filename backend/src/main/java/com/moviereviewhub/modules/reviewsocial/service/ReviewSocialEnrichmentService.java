package com.moviereviewhub.modules.reviewsocial.service;

import com.moviereviewhub.modules.favorite.repository.FavoriteRepository;
import com.moviereviewhub.modules.reviewsocial.domain.ReviewTargetType;
import com.moviereviewhub.modules.reviewsocial.dto.ReviewCardResponse;
import com.moviereviewhub.modules.reviewsocial.dto.ReviewCardSource;
import com.moviereviewhub.modules.reviewsocial.repository.ReviewLikeRepository;
import com.moviereviewhub.modules.reviewsocial.repository.ReviewReplyRepository;
import com.moviereviewhub.modules.seriesfavorite.repository.SeriesFavoriteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Bulk-enriches a homogeneous list of reviews (all about the same movie OR same series)
 * into the social-card response shape. Performs a fixed number of queries (3 to 5)
 * regardless of input size: like-counts, reply-counts, optional liked-by-me set,
 * and one author-favorited lookup per kind.
 */
@Service
@RequiredArgsConstructor
public class ReviewSocialEnrichmentService {

    private final ReviewLikeRepository likeRepository;
    private final ReviewReplyRepository replyRepository;
    private final FavoriteRepository favoriteRepository;
    private final SeriesFavoriteRepository seriesFavoriteRepository;

    @Transactional(readOnly = true)
    public List<ReviewCardResponse> enrich(
            ReviewTargetType kind,
            Long targetId,
            String targetTitle,
            String targetPosterUrl,
            List<ReviewCardSource> sources,
            Long currentUserId
    ) {
        if (sources.isEmpty()) {
            return List.of();
        }

        List<Long> reviewIds = sources.stream().map(ReviewCardSource::id).toList();
        Set<Long> authorIds = sources.stream()
                .map(ReviewCardSource::authorId)
                .collect(Collectors.toCollection(HashSet::new));

        // like/reply counts ya vienen denormalizados en el source (V19 triggers).
        // Solo el "likedByMe" sigue siendo per-user, requiere 1 query.
        Set<Long> likedByMe = currentUserId == null
                ? Collections.emptySet()
                : new HashSet<>(likeRepository.findLikedTargetIds(
                        currentUserId, kind, reviewIds));

        Set<Long> authorFavorited = switch (kind) {
            case MOVIE -> new HashSet<>(
                    favoriteRepository.findUserIdsFavoritingMovie(targetId, authorIds));
            case SERIES -> new HashSet<>(
                    seriesFavoriteRepository.findUserIdsFavoritingSeries(targetId, authorIds));
        };

        return sources.stream()
                .map(s -> new ReviewCardResponse(
                        s.id(),
                        kind,
                        s.storedRating() / 2.0,
                        s.comment(),
                        s.authorId(),
                        s.authorUsername(),
                        s.authorAvatarUrl(),
                        targetId,
                        targetTitle,
                        targetPosterUrl,
                        authorFavorited.contains(s.authorId()),
                        s.likeCount(),
                        s.replyCount(),
                        likedByMe.contains(s.id()),
                        s.createdAt(),
                        s.updatedAt()
                ))
                .toList();
    }

    public ReviewCardResponse enrichSingle(
            ReviewTargetType kind,
            Long targetId,
            String targetTitle,
            String targetPosterUrl,
            ReviewCardSource source,
            Long currentUserId
    ) {
        return enrich(kind, targetId, targetTitle, targetPosterUrl,
                List.of(source), currentUserId).get(0);
    }

    /**
     * Cleanup helper: bulk-removes all likes for a review and soft-deletes its replies.
     * Called by review services on review soft-delete.
     */
    @Transactional
    public void purgeForReview(ReviewTargetType kind, Long reviewId) {
        likeRepository.deleteAllForTarget(kind, reviewId);
        replyRepository.softDeleteAllForTarget(kind, reviewId);
    }
}
