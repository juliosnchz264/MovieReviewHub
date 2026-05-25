-- =====================================================================
-- V16  Reply threading metadata.
--      Adds precomputed `depth` and `root_reply_id` so loading an entire
--      thread is a single indexed scan and per-row recursion is unnecessary.
--      Backfill is recursive: walks parent_reply_id chains from roots.
--      MAX depth is bounded at 3 — past that, UX becomes unreadable and
--      Reddit collapses deeper threads anyway.
-- =====================================================================

ALTER TABLE review_replies
    ADD COLUMN depth         SMALLINT,
    ADD COLUMN root_reply_id BIGINT REFERENCES review_replies(id) ON DELETE CASCADE;

-- Recursive backfill: walk the parent chain to assign depth + root_reply_id.
-- V14 added parent_reply_id but no UI ever created nested replies, so in
-- practice all rows hit the root branch. The CTE is kept for safety.
WITH RECURSIVE thread AS (
    SELECT id, parent_reply_id, 0::smallint AS depth, id AS root_reply_id
    FROM review_replies
    WHERE parent_reply_id IS NULL

    UNION ALL

    SELECT r.id, r.parent_reply_id, (t.depth + 1)::smallint, t.root_reply_id
    FROM review_replies r
    JOIN thread t ON r.parent_reply_id = t.id
)
UPDATE review_replies r
SET depth         = t.depth,
    root_reply_id = t.root_reply_id
FROM thread t
WHERE r.id = t.id;

ALTER TABLE review_replies
    ALTER COLUMN depth         SET NOT NULL,
    ALTER COLUMN depth         SET DEFAULT 0,
    ALTER COLUMN root_reply_id SET NOT NULL;

ALTER TABLE review_replies
    ADD CONSTRAINT chk_review_replies_depth_bounded
        CHECK (depth >= 0 AND depth <= 3);

-- Thread-walk index: load every active reply in a thread in created_at order.
CREATE INDEX idx_review_replies_root_thread
    ON review_replies (root_reply_id, created_at ASC, id ASC)
    WHERE deleted = false;
