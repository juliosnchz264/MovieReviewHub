package com.moviereviewhub.modules.movie.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Refrescos periodicos de las materialized views que alimentan el ranking
 * de "trending" de movies y series. Pasan de O(catalogo x reviews) por
 * request a un index scan sobre la materialized view.
 *
 * CONCURRENTLY requiere un UNIQUE index (creado en V20) y permite leer la
 * view mientras se refresca, sin lock en la tabla de origen.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class CatalogTrendingRefreshJob {

    private final JdbcTemplate jdbcTemplate;

    @Scheduled(fixedRateString = "${app.catalog.trending-refresh-ms:600000}",
               initialDelayString = "${app.catalog.trending-refresh-delay-ms:60000}")
    public void refresh() {
        long start = System.currentTimeMillis();
        try {
            jdbcTemplate.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY movie_trending_stats");
            jdbcTemplate.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY series_trending_stats");
            log.info("catalog trending stats refreshed in {} ms", System.currentTimeMillis() - start);
        } catch (Exception e) {
            log.warn("catalog trending refresh failed: {}", e.getMessage());
        }
    }
}
