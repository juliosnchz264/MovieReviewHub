package com.moviereviewhub.security.jwt;

import com.moviereviewhub.security.userdetails.CustomUserDetailsService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import com.moviereviewhub.security.userdetails.CustomUserDetails;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String HEADER = "Authorization";
    private static final String PREFIX = "Bearer ";
    private static final String STREAM_PATH = "/api/v1/notifications/stream";
    private static final String STREAM_TOKEN_PARAM = "token";
    private static final String LEGACY_STREAM_TOKEN_PARAM = "access_token";

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {

        String token = extractToken(request);
        if (token == null) {
            chain.doFilter(request, response);
            return;
        }

        try {
            Claims claims = jwtService.parse(token);

            boolean accessOnStreamPath = jwtService.isAccessToken(claims);
            boolean sseOnStreamPath = jwtService.isSseToken(claims)
                    && STREAM_PATH.equals(request.getRequestURI());

            if (!accessOnStreamPath && !sseOnStreamPath) {
                chain.doFilter(request, response);
                return;
            }

            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                Long subjectId = parseSubjectId(claims);
                UserDetails userDetails;
                if (sseOnStreamPath) {
                    // SSE token has no email claim — load by subject (user id).
                    userDetails = userDetailsService.loadUserById(subjectId);
                } else {
                    String email = claims.get("email", String.class);
                    userDetails = userDetailsService.loadUserByUsername(email);
                }

                // Defense against email reuse: if the row resolved by email
                // doesn't have the same id the token was issued for (e.g.,
                // the original account was deleted and a new user later
                // registered with the same address), reject the token.
                if (userDetails instanceof CustomUserDetails cud
                        && subjectId != null
                        && !subjectId.equals(cud.getId())) {
                    log.warn("JWT subject mismatch: token sub={} resolved id={}",
                            subjectId, cud.getId());
                    chain.doFilter(request, response);
                    return;
                }

                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());
                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        } catch (JwtException ex) {
            log.debug("JWT validation failed: {}", ex.getMessage());
            SecurityContextHolder.clearContext();
        }

        chain.doFilter(request, response);
    }

    /**
     * Tries the standard {@code Authorization: Bearer …} header first.
     * As a narrow exception, the SSE stream endpoint also accepts an
     * {@code ?access_token=…} query parameter because the browser
     * {@code EventSource} API cannot attach custom headers. The token
     * remains a normal short-lived JWT, so leakage via referrer/history is
     * bounded to the access-token TTL.
     */
    private static Long parseSubjectId(Claims claims) {
        try {
            return Long.valueOf(claims.getSubject());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader(HEADER);
        if (header != null && header.startsWith(PREFIX)) {
            return header.substring(PREFIX.length());
        }
        if (STREAM_PATH.equals(request.getRequestURI())) {
            String param = request.getParameter(STREAM_TOKEN_PARAM);
            if (param != null && !param.isBlank()) return param;
            String legacy = request.getParameter(LEGACY_STREAM_TOKEN_PARAM);
            if (legacy != null && !legacy.isBlank()) return legacy;
        }
        return null;
    }
}
