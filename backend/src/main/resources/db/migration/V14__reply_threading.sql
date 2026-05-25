-- =====================================================================
-- V14  Threaded replies. Adds nullable parent_reply_id to review_replies
--      so users can answer specific replies, not only the root review.
--      Top-level replies keep parent_reply_id NULL (current behaviour).
-- =====================================================================

ALTER TABLE review_replies
    ADD COLUMN parent_reply_id BIGINT;

ALTER TABLE review_replies
    ADD CONSTRAINT review_replies_parent_fk
        FOREIGN KEY (parent_reply_id) REFERENCES review_replies(id)
        ON DELETE SET NULL;

-- Self-reference guard: a reply cannot be its own parent.
ALTER TABLE review_replies
    ADD CONSTRAINT review_replies_no_self_parent
        CHECK (parent_reply_id IS NULL OR parent_reply_id <> id);

-- Lookup index for "load all replies in this thread" queries.
CREATE INDEX idx_review_replies_parent
    ON review_replies (parent_reply_id, created_at ASC)
    WHERE parent_reply_id IS NOT NULL AND deleted = false;
