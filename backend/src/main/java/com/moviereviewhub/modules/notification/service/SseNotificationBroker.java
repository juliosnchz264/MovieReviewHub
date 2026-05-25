package com.moviereviewhub.modules.notification.service;

import com.moviereviewhub.modules.notification.dto.NotificationResponse;
import com.moviereviewhub.modules.notification.dto.UnreadCountResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * In-memory registry of active SSE connections, keyed by recipient userId.
 * One user can have multiple emitters open (multiple tabs/devices). All of
 * them receive every push for that user.
 *
 * Scope: single JVM. If we ever scale to multiple backend instances, swap
 * this for a Redis/Postgres LISTEN-NOTIFY fan-out without changing the
 * service-layer contract.
 */
@Component
@Slf4j
public class SseNotificationBroker {

    private static final long EMITTER_TIMEOUT_MS = 0L; // never time out from server side
    private static final String EVENT_NOTIFICATION = "notification";
    private static final String EVENT_UNREAD_COUNT = "unread-count";
    private static final String EVENT_HEARTBEAT = "heartbeat";

    private final Map<Long, CopyOnWriteArrayList<SseEmitter>> connections = new ConcurrentHashMap<>();

    public SseEmitter register(Long userId) {
        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT_MS);
        connections.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> remove(userId, emitter));
        emitter.onTimeout(() -> {
            emitter.complete();
            remove(userId, emitter);
        });
        emitter.onError(e -> {
            log.debug("SSE emitter for user {} errored: {}", userId, e.getMessage());
            remove(userId, emitter);
        });

        // Send an initial connect event so the client knows the stream is live.
        try {
            emitter.send(SseEmitter.event().name("connected").data("ok"));
        } catch (IOException e) {
            remove(userId, emitter);
        }
        return emitter;
    }

    public void publishNotification(Long userId, NotificationResponse payload) {
        send(userId, EVENT_NOTIFICATION, payload);
    }

    public void publishUnreadCount(Long userId, long count) {
        send(userId, EVENT_UNREAD_COUNT, new UnreadCountResponse(count));
    }

    private void send(Long userId, String event, Object payload) {
        List<SseEmitter> emitters = connections.get(userId);
        if (emitters == null || emitters.isEmpty()) return;
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name(event).data(payload));
            } catch (IOException | IllegalStateException e) {
                // Dead connection — remove and let the client reconnect.
                remove(userId, emitter);
                try {
                    emitter.complete();
                } catch (Exception ignored) {
                    // already completed
                }
            }
        }
    }

    /**
     * Periodic ping so reverse proxies (nginx, Render's edge) don't kill
     * idle connections. Comment-only events keep the socket alive without
     * triggering an EventSource onmessage on the client.
     */
    @Scheduled(fixedRate = 25_000L)
    public void heartbeat() {
        if (connections.isEmpty()) return;
        for (var entry : connections.entrySet()) {
            for (SseEmitter emitter : entry.getValue()) {
                try {
                    emitter.send(SseEmitter.event().name(EVENT_HEARTBEAT).data("ping"));
                } catch (IOException | IllegalStateException e) {
                    remove(entry.getKey(), emitter);
                    try {
                        emitter.complete();
                    } catch (Exception ignored) {
                        // already completed
                    }
                }
            }
        }
    }

    private void remove(Long userId, SseEmitter emitter) {
        List<SseEmitter> emitters = connections.get(userId);
        if (emitters == null) return;
        emitters.remove(emitter);
        if (emitters.isEmpty()) {
            connections.remove(userId, emitters);
        }
    }
}
