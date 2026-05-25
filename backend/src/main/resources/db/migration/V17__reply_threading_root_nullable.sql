-- =====================================================================
-- V17  Make `root_reply_id` nullable and treat NULL as "I am the root".
--
--      Why: V16 set root_reply_id = self.id for top-level replies. That
--      blocks new INSERTs at the service layer because we cannot reference
--      a not-yet-allocated id (chicken-and-egg with the FK). Treating NULL
--      as "self" sidesteps the self-reference and matches how the
--      ReviewReplyService now writes rows.
--
--      Order matters: drop NOT NULL FIRST so the UPDATE that nulls top-
--      level rows isn't rejected by the still-active constraint.
-- =====================================================================

ALTER TABLE review_replies
    ALTER COLUMN root_reply_id DROP NOT NULL;

-- Top-level rows currently have root_reply_id = id; null them out.
UPDATE review_replies
   SET root_reply_id = NULL
 WHERE parent_reply_id IS NULL
   AND root_reply_id = id;

-- Sanity: a top-level reply must NOT point to a root (it IS the root); a
-- descendant must point to one. Mirrors the service-layer invariants.
ALTER TABLE review_replies
    ADD CONSTRAINT chk_review_replies_root_consistency
        CHECK (
            (parent_reply_id IS NULL AND root_reply_id IS NULL AND depth = 0)
            OR
            (parent_reply_id IS NOT NULL AND root_reply_id IS NOT NULL AND depth > 0)
        );

-- Replace the V16 thread index with one that excludes the NULL root rows
-- (they are roots themselves and matched by `id = :rootId`).
DROP INDEX IF EXISTS idx_review_replies_root_thread;
CREATE INDEX idx_review_replies_root_thread
    ON review_replies (root_reply_id, created_at ASC, id ASC)
    WHERE deleted = false AND root_reply_id IS NOT NULL;
