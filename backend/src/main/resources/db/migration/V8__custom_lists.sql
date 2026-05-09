-- =====================================================================
-- V8  Custom lists (watchlists). Lista mixta movies + series.
--      item = movie XOR series (CHECK constraint).
--      Slug random base62 22 chars (UNLISTED share). 3 visibilities.
--      Listas default: WATCHLIST + WATCHED auto por usuario, no borrables.
-- =====================================================================

CREATE TABLE lists (
    id            BIGSERIAL    PRIMARY KEY,
    user_id       BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title         VARCHAR(80)  NOT NULL,
    description   VARCHAR(500),
    slug          VARCHAR(32)  NOT NULL UNIQUE,
    visibility    VARCHAR(16)  NOT NULL DEFAULT 'PRIVATE',
    is_default    BOOLEAN      NOT NULL DEFAULT FALSE,
    default_kind  VARCHAR(16),
    item_count    INT          NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by    VARCHAR(100),
    deleted       BOOLEAN      NOT NULL DEFAULT FALSE,
    CONSTRAINT lists_visibility_check
        CHECK (visibility IN ('PRIVATE','UNLISTED','PUBLIC')),
    CONSTRAINT lists_default_kind_check
        CHECK (default_kind IS NULL OR default_kind IN ('WATCHLIST','WATCHED')),
    CONSTRAINT lists_default_consistency_check
        CHECK ((is_default = TRUE) = (default_kind IS NOT NULL))
);

CREATE INDEX idx_lists_user        ON lists (user_id)    WHERE deleted = FALSE;
CREATE INDEX idx_lists_visibility  ON lists (visibility) WHERE deleted = FALSE;

-- Una lista default por kind por usuario.
CREATE UNIQUE INDEX idx_lists_user_default_kind
    ON lists (user_id, default_kind)
    WHERE default_kind IS NOT NULL AND deleted = FALSE;

CREATE TABLE list_items (
    id            BIGSERIAL    PRIMARY KEY,
    list_id       BIGINT       NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    movie_id      BIGINT       REFERENCES movies(id) ON DELETE CASCADE,
    series_id     BIGINT       REFERENCES series(id) ON DELETE CASCADE,
    note          VARCHAR(280),
    position      INT,
    added_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT list_items_xor_check
        CHECK ((movie_id IS NOT NULL)::int + (series_id IS NOT NULL)::int = 1)
);

CREATE UNIQUE INDEX idx_list_items_unique_movie
    ON list_items (list_id, movie_id) WHERE movie_id IS NOT NULL;
CREATE UNIQUE INDEX idx_list_items_unique_series
    ON list_items (list_id, series_id) WHERE series_id IS NOT NULL;
CREATE INDEX idx_list_items_list_added ON list_items (list_id, added_at DESC);
CREATE INDEX idx_list_items_movie ON list_items (movie_id) WHERE movie_id IS NOT NULL;
CREATE INDEX idx_list_items_series ON list_items (series_id) WHERE series_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- Backfill: crear listas default para usuarios existentes.
--   Slug derivado pseudo-random via md5(uuid). 22 chars.
--   substring md5 16 chars + sufijo 6 chars uuid → suficiente unicidad.
-- ---------------------------------------------------------------------
INSERT INTO lists (user_id, title, slug, visibility, is_default, default_kind, item_count)
SELECT u.id, 'Watchlist',
       substr(md5(random()::text || u.id::text || 'WATCHLIST'), 1, 22),
       'PRIVATE', TRUE, 'WATCHLIST', 0
FROM users u
WHERE u.deleted = FALSE
  AND NOT EXISTS (
      SELECT 1 FROM lists l
      WHERE l.user_id = u.id AND l.default_kind = 'WATCHLIST' AND l.deleted = FALSE
  );

INSERT INTO lists (user_id, title, slug, visibility, is_default, default_kind, item_count)
SELECT u.id, 'Watched',
       substr(md5(random()::text || u.id::text || 'WATCHED'), 1, 22),
       'PRIVATE', TRUE, 'WATCHED', 0
FROM users u
WHERE u.deleted = FALSE
  AND NOT EXISTS (
      SELECT 1 FROM lists l
      WHERE l.user_id = u.id AND l.default_kind = 'WATCHED' AND l.deleted = FALSE
  );
