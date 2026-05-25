-- =====================================================================
-- V15  Likes on review replies.
--      Separate table (not folded into review_likes) so we get a real
--      foreign key to review_replies(id) instead of a polymorphic loose
--      pointer. ON DELETE CASCADE drops likes when the reply is hard-
--      deleted; soft-deleted replies keep their likes (just hidden by the
--      service layer).
-- =====================================================================

CREATE TABLE review_reply_likes (
    user_id    BIGINT      NOT NULL REFERENCES users(id)          ON DELETE CASCADE,
    reply_id   BIGINT      NOT NULL REFERENCES review_replies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT review_reply_likes_pk PRIMARY KEY (user_id, reply_id)
);

-- Fast like-count and "did I like it" lookups per reply.
CREATE INDEX idx_review_reply_likes_reply ON review_reply_likes(reply_id);
