package com.moviereviewhub.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * In-memory caches for TMDB look-ups that are expensive to repeat (cast,
 * trailer) but tolerate hourly staleness. Caffeine bounds memory so a hot
 * library can't OOM the JVM, and the TTL keeps catalog changes propagating
 * without manual eviction.
 */
@Configuration
@EnableCaching
public class CacheConfig {

    public static final String TMDB_CAST = "tmdb-cast";
    public static final String TMDB_TRAILER = "tmdb-trailer";

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager mgr = new CaffeineCacheManager(TMDB_CAST, TMDB_TRAILER);
        mgr.setCaffeine(Caffeine.newBuilder()
                .expireAfterWrite(Duration.ofHours(1))
                .maximumSize(2_000));
        return mgr;
    }
}
