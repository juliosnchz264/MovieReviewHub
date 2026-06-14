package com.moviereviewhub.security;

import com.moviereviewhub.config.properties.CookieProperties;
import com.moviereviewhub.config.properties.CorsProperties;
import com.moviereviewhub.security.jwt.JwtAuthenticationFilter;
import com.moviereviewhub.security.oauth2.CookieOAuth2AuthorizationRequestRepository;
import com.moviereviewhub.security.oauth2.OAuth2FailureHandler;
import com.moviereviewhub.security.oauth2.OAuth2SuccessHandler;
import com.moviereviewhub.security.ratelimit.RateLimitFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Stream;
import jakarta.servlet.DispatcherType;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private static final String[] BASE_PUBLIC_PATHS = {
            "/api/v1/auth/**",
            "/actuator/**",
            "/oauth2/**",
            "/login/oauth2/**",
            // Tomcat dispatches "/error" after async SSE completion/timeout;
            // Spring Security re-runs the filter chain on that dispatch, so it
            // must be permitAll or every SSE close emits an AccessDenied trace.
            "/error"
    };

    // Solo se concatenan en perfil no-prod. Defensa en profundidad: aunque
    // SPRINGDOC_ENABLED se active por error en prod, los paths siguen
    // requiriendo auth (no permitAll). Dos cerrojos independientes.
    private static final String[] SPRINGDOC_PUBLIC_PATHS = {
            "/v3/api-docs/**",
            "/swagger-ui/**",
            "/swagger-ui.html"
    };

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RateLimitFilter rateLimitFilter;
    private final CorsProperties corsProperties;
    private final CookieProperties cookieProperties;
    private final OAuth2SuccessHandler oauth2SuccessHandler;
    private final OAuth2FailureHandler oauth2FailureHandler;
    private final com.moviereviewhub.config.properties.JwtProperties jwtProperties;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, Environment env) throws Exception {
        boolean isProd = Arrays.asList(env.getActiveProfiles()).contains("prod");
        String[] publicPaths = isProd
                ? BASE_PUBLIC_PATHS
                : Stream.concat(Arrays.stream(BASE_PUBLIC_PATHS), Arrays.stream(SPRINGDOC_PUBLIC_PATHS))
                        .toArray(String[]::new);

        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(c -> c.configurationSource(corsConfigurationSource()))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // ASYNC/ERROR are internal re-dispatches of an already-authorized
                        // request (SseEmitter completion, /error forward). Spring Security 6
                        // filters all dispatcher types by default, so without this it
                        // re-authorizes the SSE stream on async completion — when the
                        // SecurityContext is already cleared — flooding AccessDenied traces
                        // ("response already committed"). The initial REQUEST dispatch is
                        // still fully authorized below.
                        .dispatcherTypeMatchers(DispatcherType.ASYNC, DispatcherType.ERROR).permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(publicPaths).permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/movies/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/series/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/people/**").permitAll()
                        // Public read of single reviews, their replies, and like state
                        // (movie + series). Mutations (POST/PUT/DELETE) still hit
                        // .anyRequest().authenticated().
                        .requestMatchers(HttpMethod.GET, "/api/v1/reviews/*/replies").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/reviews/*/like").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/reviews/*").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/series-reviews/*/replies").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/series-reviews/*/like").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/series-reviews/*").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/review-replies/*/thread").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/review-replies/*/children").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/review-replies/*/ancestry").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/tmdb/posters").permitAll()
                        // Lists: GET por slug + GET items + listas PUBLIC de un usuario son accesibles anon.
                        // PRIVATE manejada en service (404 si no eres owner). /users/me/lists requiere auth via anyRequest.
                        .requestMatchers(HttpMethod.GET, "/api/v1/lists/*").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/lists/*/items").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/users/*/lists").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/users/*/profile").permitAll()
                        .anyRequest().authenticated()
                )
                .oauth2Login(oauth -> oauth
                        .authorizationEndpoint(a -> a.authorizationRequestRepository(authorizationRequestRepository()))
                        .successHandler(oauth2SuccessHandler)
                        .failureHandler(oauth2FailureHandler)
                )
                .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthorizationRequestRepository<OAuth2AuthorizationRequest> authorizationRequestRepository() {
        return new CookieOAuth2AuthorizationRequestRepository(
                cookieProperties.secure(),
                cookieProperties.sameSite(),
                java.util.Base64.getDecoder().decode(jwtProperties.secret())
        );
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(corsProperties.allowedOrigins());
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        // Explicit allow-list. Wildcard "*" mixed with credentials is legal in
        // Spring's CORS impl but a bad signal — request shaping is easier to
        // reason about with a closed list.
        cfg.setAllowedHeaders(List.of(
                "Authorization",
                "Content-Type",
                "Accept",
                "Accept-Language",
                "X-Requested-With",
                "X-Request-Id"
        ));
        cfg.setExposedHeaders(List.of("Authorization", "X-Request-Id"));
        cfg.setAllowCredentials(true);
        cfg.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }
}
