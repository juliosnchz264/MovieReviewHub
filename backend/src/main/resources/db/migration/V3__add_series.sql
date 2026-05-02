-- =====================================================================
-- V3  Tabla series (TV shows). Estructura paralela a movies pero sin
--      reviews/favorites de momento (catalogo + admin import desde TMDB).
-- =====================================================================

CREATE TABLE series (
    id                BIGSERIAL    PRIMARY KEY,
    title             VARCHAR(255) NOT NULL,
    description       TEXT,
    genre             VARCHAR(50),
    image_url         TEXT,
    first_air_date    DATE,
    last_air_date     DATE,
    number_of_seasons INTEGER,
    number_of_episodes INTEGER,
    tmdb_id           BIGINT,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by        VARCHAR(100),
    deleted           BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_series_title          ON series (title)          WHERE deleted = FALSE;
CREATE INDEX idx_series_genre          ON series (genre)          WHERE deleted = FALSE;
CREATE INDEX idx_series_first_air_date ON series (first_air_date) WHERE deleted = FALSE;

CREATE UNIQUE INDEX idx_series_tmdb_id
    ON series (tmdb_id)
    WHERE tmdb_id IS NOT NULL;
