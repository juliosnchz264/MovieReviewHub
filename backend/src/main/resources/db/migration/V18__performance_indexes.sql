-- =====================================================================
-- V18  Performance indexes + integrity tightening.
--      1. Cover FKs without index (avoid seq-scan on user delete).
--      2. Cover sort columns to remove in-memory sort hotpaths.
--      3. lists.slug partial unique (consistent with soft-delete pattern).
--      4. notifications type CHECK constraints.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. notifications: actor_id + last_actor_id covered (ON DELETE SET NULL
--    on user delete becomes a seq-scan without these).
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_notifications_actor
    ON notifications (actor_id)
    WHERE actor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_last_actor
    ON notifications (last_actor_id)
    WHERE last_actor_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 2. review_replies.user_id: existing partial index excludes soft-deleted
--    rows. Add a full-coverage one for admin/cleanup queries that may
--    inspect deleted rows.
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_review_replies_user_full
    ON review_replies (user_id);

-- ---------------------------------------------------------------------
-- 3. reviews / series_reviews: include created_at DESC so feed queries
--    skip the in-memory sort.
-- ---------------------------------------------------------------------
DROP INDEX IF EXISTS idx_reviews_movie;
CREATE INDEX idx_reviews_movie_created
    ON reviews (movie_id, created_at DESC)
    WHERE deleted = FALSE;

DROP INDEX IF EXISTS idx_series_reviews_series;
CREATE INDEX idx_series_reviews_series_created
    ON series_reviews (series_id, created_at DESC)
    WHERE deleted = FALSE;

-- ---------------------------------------------------------------------
-- 4. list_items: include position NULLS LAST + added_at DESC so the
--    "ORDER BY position ASC NULLS LAST, added_at DESC" query is index-only.
-- ---------------------------------------------------------------------
DROP INDEX IF EXISTS idx_list_items_list_added;
CREATE INDEX idx_list_items_list_position_added
    ON list_items (list_id, position NULLS LAST, added_at DESC);

-- ---------------------------------------------------------------------
-- 5. lists.slug: drop global UNIQUE constraint, add partial unique only
--    on active rows. Consistent with the soft-delete pattern used
--    elsewhere; allows slug reuse after a list is soft-deleted.
--    Slug is random base62 22-char so collision risk is negligible
--    even if a soft-deleted row keeps the value.
-- ---------------------------------------------------------------------
ALTER TABLE lists DROP CONSTRAINT IF EXISTS lists_slug_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lists_slug_active
    ON lists (slug)
    WHERE deleted = FALSE;

-- ---------------------------------------------------------------------
-- 6. notifications: enforce target_type / context_type domain via CHECK,
--    parallel to review_replies_target_type_check. Includes REPLY which
--    is the discriminator used for reply-on-reply notifications.
-- ---------------------------------------------------------------------
ALTER TABLE notifications
    ADD CONSTRAINT notifications_target_type_check
    CHECK (target_type IS NULL OR target_type IN ('REVIEW_MOVIE', 'REVIEW_SERIES', 'REPLY'));

ALTER TABLE notifications
    ADD CONSTRAINT notifications_context_type_check
    CHECK (context_type IS NULL OR context_type IN ('REVIEW_MOVIE', 'REVIEW_SERIES', 'REPLY'));
