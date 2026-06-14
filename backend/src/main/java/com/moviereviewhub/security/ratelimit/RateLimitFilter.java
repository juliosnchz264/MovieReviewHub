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
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limit por IP en endpoints sensibles auth.
 * 10 requests / minuto por IP.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    // Tight tier: credential / account-mutation endpoints. Brute-force guard.
    private static final List<String> AUTH_PATTERNS = List.of(
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/refresh",
            "/api/v1/users/me/password",
            "/api/v1/users/me/password/set",
            "/api/v1/users/me/email",
            "/oauth2/authorization/**",
            "/login/oauth2/code/**"
    );

    // Looser tier: the actual enumeration surface — catalog list/search and
    // single-item detail. Single-segment patterns (e.g. /movies/*) deliberately
    // exclude the chatty per-item sub-calls a logged-in SPA fires per card
    // (/movies/{id}/in-my-lists, /reviews/me, /cast, /trailer, /similar), so
    // normal browsing never trips the limit while bulk scraping still does.
    private static final List<String> READ_PATTERNS = List.of(
            "/api/v1/movies",
            "/api/v1/movies/*",
            "/api/v1/series",
            "/api/v1/series/*",
            "/api/v1/people/*",
            "/api/v1/users/*/profile"
    );

    private static final int AUTH_CAPACITY = 10;
    private static final int READ_CAPACITY = 100;
    private static final Duration WINDOW = Duration.ofMinutes(1);
    private static final int MAX_BUCKETS = 10_000;

    private final ConcurrentHashMap<String, Entry> buckets = new ConcurrentHashMap<>();
    private final AntPathMatcher pathMatcher = new AntPathMatcher();
    private final ObjectMapper objectMapper;

    private record Entry(Bucket bucket, long lastUsedEpochMs) {
        Entry touch() { return new Entry(bucket, System.currentTimeMillis()); }
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {

        int capacity = capacityFor(request.getRequestURI());
        if (capacity == 0) {
            chain.doFilter(request, response);
            return;
        }

        String ip = clientIp(request);
        // Key by ip + tier so a client's catalog reads and auth attempts use
        // independent buckets (a burst of reads must not lock out login).
        String key = ip + ":" + capacity;
        Entry entry = buckets.compute(key, (k, current) -> {
            if (current != null) return current.touch();
            return new Entry(
                    Bucket.builder()
                            .addLimit(Bandwidth.builder().capacity(capacity).refillIntervally(capacity, WINDOW).build())
                            .build(),
                    System.currentTimeMillis()
            );
        });
        Bucket bucket = entry.bucket();

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

    /** 0 = not limited; otherwise the per-minute capacity for the matched tier. */
    private int capacityFor(String uri) {
        if (matchesAny(uri, AUTH_PATTERNS)) return AUTH_CAPACITY;
        if (matchesAny(uri, READ_PATTERNS)) return READ_CAPACITY;
        return 0;
    }

    private boolean matchesAny(String uri, List<String> patterns) {
        for (String pattern : patterns) {
            if (pattern.equals(uri)) return true;
            if (pattern.contains("*") && pathMatcher.match(pattern, uri)) return true;
        }
        return false;
    }

    /**
     * Sweep the bucket registry once an hour: drop entries idle longer than
     * 10× the window, hard-cap total size. Without this the map grows
     * unbounded with one entry per unique IP — a DoS surface on its own.
     */
    @Scheduled(fixedRate = 3_600_000L)
    void sweepIdleBuckets() {
        long cutoff = System.currentTimeMillis() - WINDOW.toMillis() * 10;
        Iterator<Map.Entry<String, Entry>> it = buckets.entrySet().iterator();
        while (it.hasNext()) {
            if (it.next().getValue().lastUsedEpochMs() < cutoff) it.remove();
        }
        if (buckets.size() > MAX_BUCKETS) {
            // Pathological growth — clear everything. Worst case all clients
            // get a fresh full bucket; acceptable defense against memory DoS.
            log.warn("rate-limit bucket cap {} reached, clearing", MAX_BUCKETS);
            buckets.clear();
        }
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
