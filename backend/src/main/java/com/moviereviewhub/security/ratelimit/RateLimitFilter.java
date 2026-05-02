package com.moviereviewhub.security.ratelimit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.moviereviewhub.exception.ErrorResponse;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limit por IP en endpoints sensibles auth.
 * 10 requests / minuto por IP.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Set<String> RATE_LIMITED_PATHS = Set.of(
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/refresh"
    );

    private static final int CAPACITY = 10;
    private static final Duration WINDOW = Duration.ofMinutes(1);

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {

        if (!RATE_LIMITED_PATHS.contains(request.getRequestURI())) {
            chain.doFilter(request, response);
            return;
        }

        String ip = clientIp(request);
        Bucket bucket = buckets.computeIfAbsent(ip, k ->
                Bucket.builder()
                        .addLimit(Bandwidth.builder().capacity(CAPACITY).refillIntervally(CAPACITY, WINDOW).build())
                        .build()
        );

        if (bucket.tryConsume(1)) {
            chain.doFilter(request, response);
            return;
        }

        log.warn("Rate limit hit by ip={} path={}", ip, request.getRequestURI());
        response.setStatus(429);
        response.setContentType("application/json");
        response.setHeader("Retry-After", String.valueOf(WINDOW.toSeconds()));
        ErrorResponse body = ErrorResponse.of(
                429,
                "Too Many Requests",
                "Rate limit exceeded. Try again in " + WINDOW.toSeconds() + " seconds.",
                request.getRequestURI()
        );
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }

    private String clientIp(HttpServletRequest request) {
        // Render/Vercel/proxies: X-Forwarded-For first IP es el cliente real.
        String header = request.getHeader("X-Forwarded-For");
        if (header != null && !header.isBlank()) {
            List<String> ips = List.of(header.split(","));
            return ips.get(0).trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) return realIp;
        return request.getRemoteAddr();
    }
}
