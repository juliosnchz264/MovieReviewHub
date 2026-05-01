package com.moviereviewhub.exception;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
        OffsetDateTime timestamp,
        int status,
        String error,
        String message,
        String path,
        Map<String, List<String>> validationErrors
) {
    public static ErrorResponse of(int status, String error, String message, String path) {
        return new ErrorResponse(OffsetDateTime.now(), status, error, message, path, null);
    }

    public static ErrorResponse withValidation(int status, String error, String message, String path,
                                               Map<String, List<String>> validationErrors) {
        return new ErrorResponse(OffsetDateTime.now(), status, error, message, path, validationErrors);
    }
}
