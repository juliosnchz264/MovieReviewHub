package com.moviereviewhub.exception;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApi(ApiException ex, HttpServletRequest req) {
        return ResponseEntity.status(ex.getStatus()).body(
                ErrorResponse.of(ex.getStatus().value(), ex.getStatus().getReasonPhrase(),
                        ex.getMessage(), req.getRequestURI())
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex,
                                                          HttpServletRequest req) {
        Map<String, List<String>> errors = new HashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            errors.computeIfAbsent(fe.getField(), k -> new java.util.ArrayList<>())
                    .add(fe.getDefaultMessage());
        }
        return ResponseEntity.badRequest().body(
                ErrorResponse.withValidation(400, "Bad Request", "Validation failed",
                        req.getRequestURI(), errors)
        );
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(BadCredentialsException ex,
                                                              HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                ErrorResponse.of(401, "Unauthorized", "Invalid credentials", req.getRequestURI())
        );
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuth(AuthenticationException ex, HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                ErrorResponse.of(401, "Unauthorized", ex.getMessage(), req.getRequestURI())
        );
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex, HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                ErrorResponse.of(403, "Forbidden", "Access denied", req.getRequestURI())
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex, HttpServletRequest req) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                ErrorResponse.of(500, "Internal Server Error", "An unexpected error occurred",
                        req.getRequestURI())
        );
    }
}
