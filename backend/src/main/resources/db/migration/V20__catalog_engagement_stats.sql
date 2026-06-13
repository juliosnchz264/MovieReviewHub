-- =====================================================================
-- V20  Catalog engagement: avg rating + review count denormalized on
--      movies/series, plus materialized views for trending.
--
--      Eliminates correlated subqueries in findTopRated / findSimilar
--      (now read a denormalized column) and reduces findTrending from
--      O(catalog × reviews) to a single index scan on the materialized
--      view (refreshed periodically by a scheduled job).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Denormalized rating stats on movies / series.
-- ---------------------------------------------------------------------
ALTER TABLE movies
    ADD COLUMN rating_avg   NUMERIC(4, 2),       -- nullable: NULL when no reviews
    ADD COLUMN review_count INT NOT NULL DEFAULT 0,
    ADD CONSTRAINT movies_review_count_nonneg CHECK (review_count >= 0);

ALTER TABLE series
    ADD COLUMN rating_avg   NUMERIC(4, 2),
    ADD COLUMN review_count INT NOT NULL DEFAULT 0,
    ADD CONSTRAINT series_review_count_nonneg CHECK (review_count >= 0);

-- Backfill from current state.
UPDATE movies m
   SET review_count = COALESCE(s.cnt, 0),
       rating_avg   = s.avg
  FROM (
      SELECT movie_id, COUNT(*) AS cnt, AVG(rating)::numeric(4, 2) AS avg
        FROM reviews
       WHERE deleted = false
       GROUP BY movie_id
  ) s
 WHERE m.id = s.movie_id;

UPDATE series s
   SET review_count = COALESCE(x.cnt, 0),
       rating_avg   = x.avg
  FROM (
      SELECT series_id, COUNT(*) AS cnt, AVG(rating)::numeric(4, 2) AS avg
        FROM series_reviews
       WHERE deleted = false
       GROUP BY series_id
  ) x
 WHERE s.id = x.series_id;

-- ---------------------------------------------------------------------
-- 2. Trigger functions to keep rating_avg + review_count in sync.
--    Recompute from scratch per impacted target — cheap because
--    reviews.movie_id is indexed and the per-movie review set is small.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_movies_rating_recompute(p_movie_id BIGINT) RETURNS VOID AS $$
BEGIN
    UPDATE movies m
       SET review_count = COALESCE(s.cnt, 0),
           rating_avg   = s.avg
      FROM (
          SELECT COUNT(*) AS cnt, AVG(rating)::numeric(4, 2) AS avg
            FROM reviews
           WHERE movie_id = p_movie_id AND deleted = false
      ) s
     WHERE m.id = p_movie_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_series_rating_recompute(p_series_id BIGINT) RETURNS VOID AS $$
BEGIN
    UPDATE series s
       SET review_count = COALESCE(x.cnt, 0),
           rating_avg   = x.avg
      FROM (
          SELECT COUNT(*) AS cnt, AVG(rating)::numeric(4, 2) AS avg
            FROM series_reviews
           WHERE series_id = p_series_id AND deleted = false
      ) x
     WHERE s.id = p_series_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_reviews_rating_sync() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM fn_movies_rating_recompute(NEW.movie_id);
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM fn_movies_rating_recompute(OLD.movie_id);
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.rating IS DISTINCT FROM NEW.rating
           OR OLD.deleted IS DISTINCT FROM NEW.deleted
           OR OLD.movie_id IS DISTINCT FROM NEW.movie_id THEN
            PERFORM fn_movies_rating_recompute(NEW.movie_id);
            IF OLD.movie_id IS DISTINCT FROM NEW.movie_id THEN
                PERFORM fn_movies_rating_recompute(OLD.movie_id);
            END IF;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reviews_rating_sync
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW EXECUTE FUNCTION fn_reviews_rating_sync();

CREATE OR REPLACE FUNCTION fn_series_reviews_rating_sync() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM fn_series_rating_recompute(NEW.series_id);
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM fn_series_rating_recompute(OLD.series_id);
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.rating IS DISTINCT FROM NEW.rating
           OR OLD.deleted IS DISTINCT FROM NEW.deleted
           OR OLD.series_id IS DISTINCT FROM NEW.series_id THEN
            PERFORM fn_series_rating_recompute(NEW.series_id);
            IF OLD.series_id IS DISTINCT FROM NEW.series_id THEN
                PERFORM fn_series_rating_recompute(OLD.series_id);
            END IF;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_series_reviews_rating_sync
    AFTER INSERT OR UPDATE OR DELETE ON series_reviews
    FOR EACH ROW EXECUTE FUNCTION fn_series_reviews_rating_sync();

-- ---------------------------------------------------------------------
-- 3. Indexes to support catalog ranking.
-- ---------------------------------------------------------------------
CREATE INDEX idx_movies_rating_avg
    ON movies (rating_avg DESC NULLS LAST, review_count DESC)
    WHERE deleted = false;

CREATE INDEX idx_series_rating_avg
    ON series (rating_avg DESC NULLS LAST, review_count DESC)
    WHERE deleted = false;

-- ---------------------------------------------------------------------
-- 4. Trending stats: materialized view recomputed by scheduled job.
--    Rolling 7-day window. Refresh job lives in CatalogStatsRefreshJob.
-- ---------------------------------------------------------------------
CREATE MATERIALIZED VIEW movie_trending_stats AS
SELECT m.id        AS movie_id,
       COALESCE(rv.cnt, 0)             AS recent_reviews,
       COALESCE(fv.cnt, 0)             AS recent_favorites,
       COALESCE(rv.cnt, 0) + COALESCE(fv.cnt, 0) * 2 AS score
  FROM movies m
  LEFT JOIN (
      SELECT movie_id, COUNT(*) AS cnt
        FROM reviews
       WHERE deleted = false AND created_at > NOW() - INTERVAL '7 days'
       GROUP BY movie_id
  ) rv ON rv.movie_id = m.id
  LEFT JOIN (
      SELECT movie_id, COUNT(*) AS cnt
        FROM favorites
       WHERE created_at > NOW() - INTERVAL '7 days'
       GROUP BY movie_id
  ) fv ON fv.movie_id = m.id
 WHERE m.deleted = false;

CREATE UNIQUE INDEX idx_movie_trending_stats_movie ON movie_trending_stats (movie_id);
CREATE INDEX idx_movie_trending_stats_score ON movie_trending_stats (score DESC, movie_id);

CREATE MATERIALIZED VIEW series_trending_stats AS
SELECT s.id        AS series_id,
       COALESCE(rv.cnt, 0)             AS recent_reviews,
       COALESCE(fv.cnt, 0)             AS recent_favorites,
       COALESCE(rv.cnt, 0) + COALESCE(fv.cnt, 0) * 2 AS score
  FROM series s
  LEFT JOIN (
      SELECT series_id, COUNT(*) AS cnt
        FROM series_reviews
       WHERE deleted = false AND created_at > NOW() - INTERVAL '7 days'
       GROUP BY series_id
  ) rv ON rv.series_id = s.id
  LEFT JOIN (
      SELECT series_id, COUNT(*) AS cnt
        FROM series_favorites
       WHERE created_at > NOW() - INTERVAL '7 days'
       GROUP BY series_id
  ) fv ON fv.series_id = s.id
 WHERE s.deleted = false;

CREATE UNIQUE INDEX idx_series_trending_stats_series ON series_trending_stats (series_id);
CREATE INDEX idx_series_trending_stats_score ON series_trending_stats (score DESC, series_id);
