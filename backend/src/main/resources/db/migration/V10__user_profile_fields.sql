-- =====================================================================
-- V10  Public profile fields: bio + cover_url.
--      bio: max 500 chars, plain text (sanitized at API boundary).
--      cover_url: TEXT, https-only enforced at service layer.
-- =====================================================================

ALTER TABLE users
    ADD COLUMN bio       VARCHAR(500),
    ADD COLUMN cover_url TEXT;
