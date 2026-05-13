-- =====================================================================
-- V12  Social layer for reviews: likes + replies.
--      Polymorphic over (target_type, target_id) so the same tables
--      cover both movie reviews and series reviews. Referential
--      integrity is enforced in the service layer.
-- =====================================================================

CREATE TABLE review_likes (
    user_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(10) NOT NULL,
    target_id   BIGINT      NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT review_likes_pk PRIMARY KEY (user_id, target_type, target_id),
    CONSTRAINT review_likes_target_type_check
        CHECK (target_type IN ('MOVIE', 'SERIES'))
);

CREATE INDEX idx_review_likes_target
    ON review_likes (target_type, target_id);

CREATE TABLE review_replies (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES users(id),
    target_type VARCHAR(10) NOT NULL,
    target_id   BIGINT      NOT NULL,
    body        TEXT        NOT NULL,
    deleted     BOOLEAN     NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by  VARCHAR(100),
    CONSTRAINT review_replies_target_type_check
        CHECK (target_type IN ('MOVIE', 'SERIES')),
    CONSTRAINT review_replies_body_length_check
        CHECK (char_length(body) BETWEEN 1 AND 2000)
);

CREATE INDEX idx_review_replies_target_active
    ON review_replies (target_type, target_id, created_at DESC)
    WHERE deleted = false;

CREATE INDEX idx_review_replies_user
    ON review_replies (user_id)
    WHERE deleted = false;
