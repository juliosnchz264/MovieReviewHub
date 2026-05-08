package com.moviereviewhub.common.keepalive;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Self-ping para evitar que Render free spin-down este servicio mientras
 * esta awake. NO despierta el servicio si ya se durmio (para eso usar el
 * cron externo en .github/workflows/keep-alive.yml).
 *
 * Activado solo si app.keep-alive.enabled=true (render.yaml lo activa en prod).
 */
@Component
@ConditionalOnProperty(name = "app.keep-alive.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class KeepAliveScheduler {

    @Value("${app.keep-alive.url:}")
    private String url;

    private final RestClient client = RestClient.create();

    @Scheduled(fixedRateString = "${app.keep-alive.interval-ms:600000}",
               initialDelayString = "${app.keep-alive.interval-ms:600000}")
    public void ping() {
        if (url.isBlank()) {
            log.warn("keep-alive enabled but app.keep-alive.url is empty — skipping");
            return;
        }
        try {
            client.get().uri(url).retrieve().toBodilessEntity();
            log.debug("keep-alive ping ok -> {}", url);
        } catch (Exception e) {
            log.warn("keep-alive ping failed: {}", e.getMessage());
        }
    }
}
