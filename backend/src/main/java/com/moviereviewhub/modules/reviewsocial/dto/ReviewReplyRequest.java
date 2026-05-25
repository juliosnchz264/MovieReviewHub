package com.moviereviewhub.modules.reviewsocial.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReviewReplyRequest(
        @NotBlank
        @Size(min = 1, max = 2000)
        String body,
        Long parentReplyId
) {
    public ReviewReplyRequest(String body) {
        this(body, null);
    }
}
