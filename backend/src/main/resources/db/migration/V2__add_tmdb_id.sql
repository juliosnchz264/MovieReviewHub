-- =====================================================================
-- V2  Anade tmdb_id a movies para vincular peliculas con TMDB.
--      tmdb_id es UNIQUE (cuando no NULL) para evitar duplicados al
--      importar la misma pelicula.
-- =====================================================================

ALTER TABLE movies
    ADD COLUMN tmdb_id BIGINT;

CREATE UNIQUE INDEX idx_movies_tmdb_id
    ON movies (tmdb_id)
    WHERE tmdb_id IS NOT NULL;
