package com.moviereviewhub.modules.notification.service;

import com.moviereviewhub.modules.notification.domain.NotificationType;
import com.moviereviewhub.modules.notification.dto.NotificationResponse;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.lang.reflect.Field;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class SseNotificationBrokerTest {

    @Test
    void registerStoresEmitterUnderRecipient() throws Exception {
        SseNotificationBroker broker = new SseNotificationBroker();
        SseEmitter e = broker.register(42L);

        assertThat(e).isNotNull();
        assertThat(connectionsOf(broker).get(42L)).hasSize(1);
    }

    @Test
    void publishNotificationFansOutToEveryEmitterForThatUser() throws Exception {
        SseNotificationBroker broker = new SseNotificationBroker();
        AtomicInteger sentA = new AtomicInteger();
        AtomicInteger sentB = new AtomicInteger();
        broker.register(7L);
        broker.register(7L);
        broker.register(99L); // unrelated user — must not receive

        // Replace emitters with counting stubs.
        var list = connectionsOf(broker).get(7L);
        list.clear();
        list.add(countingEmitter(sentA));
        list.add(countingEmitter(sentB));

        broker.publishNotification(7L, sampleNotification());

        assertThat(sentA.get()).isEqualTo(1);
        assertThat(sentB.get()).isEqualTo(1);
    }

    @Test
    void publishUnreadCountSendsToOwnerOnly() throws Exception {
        SseNotificationBroker broker = new SseNotificationBroker();
        AtomicInteger ownerSent = new AtomicInteger();
        AtomicInteger otherSent = new AtomicInteger();

        broker.register(1L);
        broker.register(2L);

        var owner = connectionsOf(broker).get(1L);
        owner.clear();
        owner.add(countingEmitter(ownerSent));

        var other = connectionsOf(broker).get(2L);
        other.clear();
        other.add(countingEmitter(otherSent));

        broker.publishUnreadCount(1L, 5L);

        assertThat(ownerSent.get()).isEqualTo(1);
        assertThat(otherSent.get()).isZero();
    }

    @Test
    void shutdownClosesAllConnections() throws Exception {
        SseNotificationBroker broker = new SseNotificationBroker();
        broker.register(1L);
        broker.register(2L);
        assertThat(connectionsOf(broker)).hasSize(2);

        broker.shutdown();

        assertThat(connectionsOf(broker)).isEmpty();
    }

    @Test
    void publishOnUnknownUserIsANoop() {
        SseNotificationBroker broker = new SseNotificationBroker();
        // Should not throw.
        broker.publishNotification(404L, sampleNotification());
        broker.publishUnreadCount(404L, 0L);
    }

    @SuppressWarnings("unchecked")
    private static Map<Long, CopyOnWriteArrayList<SseEmitter>> connectionsOf(
            SseNotificationBroker broker) throws Exception {
        Field f = SseNotificationBroker.class.getDeclaredField("connections");
        f.setAccessible(true);
        return (Map<Long, CopyOnWriteArrayList<SseEmitter>>) f.get(broker);
    }

    private static SseEmitter countingEmitter(AtomicInteger counter) {
        return new SseEmitter() {
            @Override
            public void send(SseEventBuilder builder) throws IOException {
                counter.incrementAndGet();
            }
        };
    }

    private static NotificationResponse sampleNotification() {
        return new NotificationResponse(
                1L,
                NotificationType.REVIEW_LIKED,
                null,
                1,
                null,
                false,
                false,
                Instant.now(),
                Instant.now()
        );
    }
}
