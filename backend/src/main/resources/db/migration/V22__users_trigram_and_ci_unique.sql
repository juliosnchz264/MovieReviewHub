-- =====================================================================
-- V22  Pg_trgm search indexes for users + case-insensitive partial unique
--      constraints on email and username (consistent with handle V11).
--
--      Replaces:
--        * idx_users_email      (V1: btree, case-sensitive, no leading
--                                wildcard → unusable by admin search)
--        * idx_users_username   (V1: idem)
--        * users.email   UNIQUE (V1: global, blocks reuse after soft-delete)
--        * users.username UNIQUE (V1: idem)
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------
-- 1. Trigram indexes so the admin search WHERE LOWER(email|username) LIKE
--    '%foo%' uses an index instead of a sequential scan.
-- ---------------------------------------------------------------------
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_username;

CREATE INDEX idx_users_email_trgm
    ON users USING gin (LOWER(email) gin_trgm_ops)
    WHERE deleted = FALSE;

CREATE INDEX idx_users_username_trgm
    ON users USING gin (LOWER(username) gin_trgm_ops)
    WHERE deleted = FALSE;

-- Plain btree on LOWER(email) for equality lookups (login / refresh hot path).
CREATE INDEX idx_users_email_lower
    ON users (LOWER(email))
    WHERE deleted = FALSE;

CREATE INDEX idx_users_username_lower
    ON users (LOWER(username))
    WHERE deleted = FALSE;

-- ---------------------------------------------------------------------
-- 2. Drop global UNIQUE constraints on email + username so a soft-deleted
--    row no longer blocks reuse. Replace with partial UNIQUE on
--    LOWER(col) WHERE deleted = FALSE — matches the handle pattern from V11.
-- ---------------------------------------------------------------------
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;

CREATE UNIQUE INDEX idx_users_email_active_unique
    ON users (LOWER(email))
    WHERE deleted = FALSE;

CREATE UNIQUE INDEX idx_users_username_active_unique
    ON users (LOWER(username))
    WHERE deleted = FALSE;
