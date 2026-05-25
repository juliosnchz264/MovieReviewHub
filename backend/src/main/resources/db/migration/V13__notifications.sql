-- =====================================================================
-- V13  Notifications system.
--      Polymorphic notifications for review likes, replies, and future
--      events (mentions, awards, follows). target/context are loose
--      pointers; referential integrity enforced by the service layer
--      so we can mix MOVIE/SERIES review ids and reply ids freely.
-- =====================================================================

CREATE TABLE notifications (
    id              BIGSERIAL    PRIMARY KEY,
    recipient_id    BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id        BIGINT                REFERENCES users(id) ON DELETE SET NULL,
    type            VARCHAR(40)  NOT NULL,

    -- Polymorphic primary subject of the notification.
    target_type     VARCHAR(20),
    target_id       BIGINT,

    -- Optional secondary subject (e.g. the parent review when target is a REPLY).
    context_type    VARCHAR(20),
    context_id      BIGINT,

    -- Lifecycle state. read_at NULL means unread; seen_at tracks bell-open.
    read_at         TIMESTAMPTZ,
    seen_at         TIMESTAMPTZ,

    -- Grouping ("Ana and 4 others liked your review").
    group_key       VARCHAR(120),
    group_count     INT          NOT NULL DEFAULT 1,
    last_actor_id   BIGINT                REFERENCES users(id) ON DELETE SET NULL,

    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT notifications_no_self_notify
        CHECK (actor_id IS NULL OR actor_id <> recipient_id),
    CONSTRAINT notifications_group_count_positive
        CHECK (group_count >= 1)
);

-- Feed query: latest notifications for a user.
CREATE INDEX idx_notifications_recipient_created
    ON notifications (recipient_id, created_at DESC);

-- Unread count + unread-only filter. Partial index keeps cost proportional
-- to the unread set, not the full table.
CREATE INDEX idx_notifications_recipient_unread
    ON notifications (recipient_id, created_at DESC)
    WHERE read_at IS NULL;

-- Grouping guard: while a group is still unread, new events collapse into it
-- via ON CONFLICT instead of creating duplicates. Once the user reads the
-- group, the partial unique releases so a fresh group can form.
CREATE UNIQUE INDEX idx_notifications_group_active
    ON notifications (recipient_id, group_key)
    WHERE read_at IS NULL AND group_key IS NOT NULL;

-- Cleanup index for retention job (delete old read notifications).
CREATE INDEX idx_notifications_read_at
    ON notifications (read_at)
    WHERE read_at IS NOT NULL;
