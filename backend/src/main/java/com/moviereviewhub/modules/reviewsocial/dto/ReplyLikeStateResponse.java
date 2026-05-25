package com.moviereviewhub.modules.reviewsocial.dto;

public record ReplyLikeStateResponse(
        Long replyId,
        boolean likedByMe,
        long likeCount
) {}
