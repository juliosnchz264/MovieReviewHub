-- =====================================================================
-- V23  Trending hybrid score.
--
--      V20 score = recent_reviews + recent_favs*2 over a 7-day window.
--      On a low-activity catalog (personal site) the window goes empty
--      and the Trending row disappears. This migration adds a lifetime
--      decay tail so the row stays populated even with zero recent
--      activity, while recent activity still dominates ranking.
--
--      score = recent_reviews + recent_favs * 2
--            + 0.1 * (total_reviews + total_favs * 2)
--
--      The 0.1 weight keeps a single recent review (=1.0) above any
--      purely-lifetime tail until lifetime engagement reaches ~10.
-- =====================================================================

DROP MATERIALIZED VIEW IF EXISTS movie_trending_stats CASCADE;
DROP MATERIALIZED VIEW IF EXISTS series_trending_stats CASCADE;

-- ---------------------------------------------------------------------
-- movie_trending_stats
-- ---------------------------------------------------------------------
CREATE MATERIALIZED VIEW movie_trending_stats AS
SELECT m.id                                                       AS movie_id,
       COALESCE(rv7.cnt, 0)                                       AS recent_reviews,
       COALESCE(fv7.cnt, 0)                                       AS recent_favorites,
       COALESCE(rva.cnt, 0)                                       AS total_reviews,
       COALESCE(fva.cnt, 0)                                       AS total_favorites,
       (COALESCE(rv7.cnt, 0) + COALESCE(fv7.cnt, 0) * 2)
         + 0.1 * (COALESCE(rva.cnt, 0) + COALESCE(fva.cnt, 0) * 2) AS score
  FROM movies m
  LEFT JOIN (
      SELECT movie_id, COUNT(*) AS cnt
        FROM reviews
       WHERE deleted = false AND created_at > NOW() - INTERVAL '7 days'
       GROUP BY movie_id
  ) rv7 ON rv7.movie_id = m.id
  LEFT JOIN (
      SELECT movie_id, COUNT(*) AS cnt
        FROM favorites
       WHERE created_at > NOW() - INTERVAL '7 days'
       GROUP BY movie_id
  ) fv7 ON fv7.movie_id = m.id
  LEFT JOIN (
      SELECT movie_id, COUNT(*) AS cnt
        FROM reviews
       WHERE deleted = false
       GROUP BY movie_id
  ) rva ON rva.movie_id = m.id
  LEFT JOIN (
      SELECT movie_id, COUNT(*) AS cnt
        FROM favorites
       GROUP BY movie_id
  ) fva ON fva.movie_id = m.id
 WHERE m.deleted = false;

CREATE UNIQUE INDEX idx_movie_trending_stats_movie ON movie_trending_stats (movie_id);
CREATE INDEX idx_movie_trending_stats_score ON movie_trending_stats (score DESC, movie_id);

-- ---------------------------------------------------------------------
-- series_trending_stats
-- ---------------------------------------------------------------------
CREATE MATERIALIZED VIEW series_trending_stats AS
SELECT s.id                                                       AS series_id,
       COALESCE(rv7.cnt, 0)                                       AS recent_reviews,
       COALESCE(fv7.cnt, 0)                                       AS recent_favorites,
       COALESCE(rva.cnt, 0)                                       AS total_reviews,
       COALESCE(fva.cnt, 0)                                       AS total_favorites,
       (COALESCE(rv7.cnt, 0) + COALESCE(fv7.cnt, 0) * 2)
         + 0.1 * (COALESCE(rva.cnt, 0) + COALESCE(fva.cnt, 0) * 2) AS score
  FROM series s
  LEFT JOIN (
      SELECT series_id, COUNT(*) AS cnt
        FROM series_reviews
       WHERE deleted = false AND created_at > NOW() - INTERVAL '7 days'
       GROUP BY series_id
  ) rv7 ON rv7.series_id = s.id
  LEFT JOIN (
      SELECT series_id, COUNT(*) AS cnt
        FROM series_favorites
       WHERE created_at > NOW() - INTERVAL '7 days'
       GROUP BY series_id
  ) fv7 ON fv7.series_id = s.id
  LEFT JOIN (
      SELECT series_id, COUNT(*) AS cnt
        FROM series_reviews
       WHERE deleted = false
       GROUP BY series_id
  ) rva ON rva.series_id = s.id
  LEFT JOIN (
      SELECT series_id, COUNT(*) AS cnt
        FROM series_favorites
       GROUP BY series_id
  ) fva ON fva.series_id = s.id
 WHERE s.deleted = false;

CREATE UNIQUE INDEX idx_series_trending_stats_series ON series_trending_stats (series_id);
CREATE INDEX idx_series_trending_stats_score ON series_trending_stats (score DESC, series_id);
