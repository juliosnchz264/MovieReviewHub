-- =====================================================================
-- V5  De single `genre VARCHAR(50)` a `genres TEXT[]` para soportar
--      multiples generos por pelicula/serie (TMDB devuelve varios).
--      Backfill copia el valor actual al array antes de drop.
-- =====================================================================

-- ----- MOVIES -----
ALTER TABLE movies ADD COLUMN genres TEXT[] NOT NULL DEFAULT '{}';

UPDATE movies
SET genres = ARRAY[genre]
WHERE genre IS NOT NULL AND genre <> '';

DROP INDEX IF EXISTS idx_movies_genre;
ALTER TABLE movies DROP COLUMN genre;

-- GIN index permite =ANY() y && (overlap) eficientes
CREATE INDEX idx_movies_genres ON movies USING GIN (genres);

-- ----- SERIES -----
ALTER TABLE series ADD COLUMN genres TEXT[] NOT NULL DEFAULT '{}';

UPDATE series
SET genres = ARRAY[genre]
WHERE genre IS NOT NULL AND genre <> '';

DROP INDEX IF EXISTS idx_series_genre;
ALTER TABLE series DROP COLUMN genre;

CREATE INDEX idx_series_genres ON series USING GIN (genres);
