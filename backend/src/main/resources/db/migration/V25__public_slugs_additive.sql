-- =====================================================================
-- V25  Public identifiers: slug + public_id (ADDITIVE / nullable phase).
--
--      Moves public URLs off sequential bigint ids onto SEO-friendly slugs
--      plus an opaque, unguessable public_id (12-char base62). Internal
--      bigint ids stay as the relational keys; only the *public* identifier
--      changes.
--
--      This migration is intentionally additive and non-enforcing:
--        - new columns are NULLABLE (no lock-heavy rewrite, safe on a live
--          table), populated by the backfill step.
--        - UNIQUE + NOT NULL constraints and indexes land in V26 AFTER the
--          backfill is verified.
--      The `person` table is brand new (populated lazily from TMDB on first
--      view), so it gets its constraints immediately.
-- =====================================================================

-- Movies -------------------------------------------------------------
ALTER TABLE movies ADD COLUMN slug      VARCHAR(160);
ALTER TABLE movies ADD COLUMN public_id VARCHAR(16);

-- Series -------------------------------------------------------------
ALTER TABLE series ADD COLUMN slug      VARCHAR(160);
ALTER TABLE series ADD COLUMN public_id VARCHAR(16);

-- Users (handle = existing CI-unique username; public_id is the opaque
-- stable fallback used for redirects when a username changes) ---------
ALTER TABLE users ADD COLUMN public_id VARCHAR(16);

-- People: previously a pure TMDB proxy with no local row. A lightweight
-- registry gives clean /people/{slug} URLs and a place to cache the
-- display name + poster. Populated lazily on first detail view.
CREATE TABLE person (
    id           BIGSERIAL    PRIMARY KEY,
    tmdb_id      BIGINT       NOT NULL UNIQUE,
    slug         VARCHAR(180) NOT NULL UNIQUE,
    name         VARCHAR(255) NOT NULL,
    profile_path VARCHAR(255),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
