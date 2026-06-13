-- =====================================================================
-- V24  Backdrop URL on movies + series.
--      Hero sections / detail pages render a wide backdrop image. Stored
--      at import time to avoid runtime TMDB round-trips on every detail
--      view. Nullable: pre-existing rows backfilled by the admin
--      refresh-backdrops job (TmdbController.refreshBackdrops).
-- =====================================================================
ALTER TABLE movies ADD COLUMN backdrop_url TEXT;
ALTER TABLE series ADD COLUMN backdrop_url TEXT;
