-- =====================================================================
-- V1__init.sql  — schema base MovieReviewHub
-- Convencion columnas: snake_case. Hibernate/JPA mapea a camelCase.
-- Auditoria + soft delete en todas las entidades de dominio.
-- =====================================================================

-- ---------------------------------------------------------------------
-- USERS
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id            BIGSERIAL    PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password      VARCHAR(255) NOT NULL,                  -- bcrypt hash
    role          VARCHAR(20)  NOT NULL DEFAULT 'ROLE_USER',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by    VARCHAR(100),
    deleted       BOOLEAN      NOT NULL DEFAULT FALSE,
    CONSTRAINT users_role_check CHECK (role IN ('ROLE_USER', 'ROLE_ADMIN'))
);

CREATE INDEX idx_users_email     ON users (email)    WHERE deleted = FALSE;
CREATE INDEX idx_users_username  ON users (username) WHERE deleted = FALSE;

-- ---------------------------------------------------------------------
-- MOVIES
-- ---------------------------------------------------------------------
CREATE TABLE movies (
    id            BIGSERIAL    PRIMARY KEY,
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    genre         VARCHAR(50),
    image_url     TEXT,
    release_date  DATE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by    VARCHAR(100),
    deleted       BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_movies_title         ON movies (title)        WHERE deleted = FALSE;
CREATE INDEX idx_movies_genre         ON movies (genre)        WHERE deleted = FALSE;
CREATE INDEX idx_movies_release_date  ON movies (release_date) WHERE deleted = FALSE;

-- ---------------------------------------------------------------------
-- REVIEWS  (1 user 1..N reviews; 1 movie 1..N reviews; 1 review por user-movie)
-- ---------------------------------------------------------------------
CREATE TABLE reviews (
    id          BIGSERIAL    PRIMARY KEY,
    rating      SMALLINT     NOT NULL,
    comment     TEXT,
    user_id     BIGINT       NOT NULL REFERENCES users(id),
    movie_id    BIGINT       NOT NULL REFERENCES movies(id),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by  VARCHAR(100),
    deleted     BOOLEAN      NOT NULL DEFAULT FALSE,
    CONSTRAINT reviews_rating_check CHECK (rating BETWEEN 1 AND 5)
);

-- 1 review activa por usuario-pelicula (permite recrear si soft-deleted)
CREATE UNIQUE INDEX idx_reviews_user_movie_active
    ON reviews (user_id, movie_id)
    WHERE deleted = FALSE;

CREATE INDEX idx_reviews_movie  ON reviews (movie_id) WHERE deleted = FALSE;
CREATE INDEX idx_reviews_user   ON reviews (user_id)  WHERE deleted = FALSE;

-- ---------------------------------------------------------------------
-- FAVORITES  (N:N users <-> movies)
-- ---------------------------------------------------------------------
CREATE TABLE favorites (
    user_id     BIGINT       NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    movie_id    BIGINT       NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, movie_id)
);

CREATE INDEX idx_favorites_movie ON favorites (movie_id);

-- ---------------------------------------------------------------------
-- REFRESH_TOKENS  (rotacion + revocacion server-side)
-- ---------------------------------------------------------------------
CREATE TABLE refresh_tokens (
    id          BIGSERIAL    PRIMARY KEY,
    token       VARCHAR(512) NOT NULL UNIQUE,
    user_id     BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ  NOT NULL,
    revoked     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user        ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_expires_at  ON refresh_tokens (expires_at);
