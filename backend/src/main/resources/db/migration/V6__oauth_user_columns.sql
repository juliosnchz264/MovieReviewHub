-- =====================================================================
-- V6__oauth_user_columns.sql
-- Add OAuth2 provider linkage to users + relax password constraint
-- (OAuth users have no local password).
-- =====================================================================

ALTER TABLE users
    ALTER COLUMN password DROP NOT NULL,
    ADD COLUMN provider    VARCHAR(20),
    ADD COLUMN provider_id VARCHAR(255),
    ADD COLUMN avatar_url  TEXT;

-- One account per (provider, provider_id) for active rows.
CREATE UNIQUE INDEX idx_users_provider_id
    ON users (provider, provider_id)
    WHERE deleted = FALSE
      AND provider IS NOT NULL
      AND provider_id IS NOT NULL;
