-- =====================================================================
-- V4  Reviews y favorites para series. Estructura paralela a la de movies
--      pero con FK a series en vez de movies.
-- =====================================================================

CREATE TABLE series_reviews (
    id          BIGSERIAL    PRIMARY KEY,
    rating      SMALLINT     NOT NULL,
    comment     TEXT,
    user_id     BIGINT       NOT NULL REFERENCES users(id),
    series_id   BIGINT       NOT NULL REFERENCES series(id),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by  VARCHAR(100),
    deleted     BOOLEAN      NOT NULL DEFAULT FALSE,
    CONSTRAINT series_reviews_rating_check CHECK (rating BETWEEN 1 AND 5)
);

CREATE UNIQUE INDEX idx_series_reviews_user_active
    ON series_reviews (user_id, series_id)
    WHERE deleted = FALSE;

CREATE INDEX idx_series_reviews_series ON series_reviews (series_id) WHERE deleted = FALSE;
CREATE INDEX idx_series_reviews_user   ON series_reviews (user_id)   WHERE deleted = FALSE;

CREATE TABLE series_favorites (
    user_id    BIGINT       NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    series_id  BIGINT       NOT NULL REFERENCES series(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, series_id)
);

CREATE INDEX idx_series_favorites_series ON series_favorites (series_id);
