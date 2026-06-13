-- =====================================================================
-- V19  Denormalize like_count / reply_count on reviews & series_reviews
--      and like_count on review_replies. Mantained by triggers on the
--      source tables so reads in the feed stop doing GROUP BY scans.
--      Backfill from current state on apply.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Add counter columns (default 0, NOT NULL).
-- ---------------------------------------------------------------------
ALTER TABLE reviews
    ADD COLUMN like_count  INT NOT NULL DEFAULT 0,
    ADD COLUMN reply_count INT NOT NULL DEFAULT 0,
    ADD CONSTRAINT reviews_like_count_nonneg  CHECK (like_count  >= 0),
    ADD CONSTRAINT reviews_reply_count_nonneg CHECK (reply_count >= 0);

ALTER TABLE series_reviews
    ADD COLUMN like_count  INT NOT NULL DEFAULT 0,
    ADD COLUMN reply_count INT NOT NULL DEFAULT 0,
    ADD CONSTRAINT series_reviews_like_count_nonneg  CHECK (like_count  >= 0),
    ADD CONSTRAINT series_reviews_reply_count_nonneg CHECK (reply_count >= 0);

ALTER TABLE review_replies
    ADD COLUMN like_count INT NOT NULL DEFAULT 0,
    ADD CONSTRAINT review_replies_like_count_nonneg CHECK (like_count >= 0);

-- ---------------------------------------------------------------------
-- 2. Backfill from current rows.
-- ---------------------------------------------------------------------
UPDATE reviews r
   SET like_count = COALESCE(l.cnt, 0)
  FROM (
      SELECT target_id, COUNT(*) AS cnt
        FROM review_likes
       WHERE target_type = 'MOVIE'
       GROUP BY target_id
  ) l
 WHERE r.id = l.target_id;

UPDATE series_reviews r
   SET like_count = COALESCE(l.cnt, 0)
  FROM (
      SELECT target_id, COUNT(*) AS cnt
        FROM review_likes
       WHERE target_type = 'SERIES'
       GROUP BY target_id
  ) l
 WHERE r.id = l.target_id;

UPDATE reviews r
   SET reply_count = COALESCE(rp.cnt, 0)
  FROM (
      SELECT target_id, COUNT(*) AS cnt
        FROM review_replies
       WHERE target_type = 'MOVIE' AND deleted = false
       GROUP BY target_id
  ) rp
 WHERE r.id = rp.target_id;

UPDATE series_reviews r
   SET reply_count = COALESCE(rp.cnt, 0)
  FROM (
      SELECT target_id, COUNT(*) AS cnt
        FROM review_replies
       WHERE target_type = 'SERIES' AND deleted = false
       GROUP BY target_id
  ) rp
 WHERE r.id = rp.target_id;

UPDATE review_replies rr
   SET like_count = COALESCE(l.cnt, 0)
  FROM (
      SELECT reply_id, COUNT(*) AS cnt
        FROM review_reply_likes
       GROUP BY reply_id
  ) l
 WHERE rr.id = l.reply_id;

-- ---------------------------------------------------------------------
-- 3. Trigger functions.
--
--    Atomic UPDATE (...+1 / ...-1) avoids read-modify-write race.
-- ---------------------------------------------------------------------

-- review_likes: maintains reviews.like_count / series_reviews.like_count
CREATE OR REPLACE FUNCTION fn_review_likes_count_sync() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.target_type = 'MOVIE' THEN
            UPDATE reviews        SET like_count = like_count + 1 WHERE id = NEW.target_id;
        ELSIF NEW.target_type = 'SERIES' THEN
            UPDATE series_reviews SET like_count = like_count + 1 WHERE id = NEW.target_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.target_type = 'MOVIE' THEN
            UPDATE reviews        SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.target_id;
        ELSIF OLD.target_type = 'SERIES' THEN
            UPDATE series_reviews SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.target_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_review_likes_count
    AFTER INSERT OR DELETE ON review_likes
    FOR EACH ROW EXECUTE FUNCTION fn_review_likes_count_sync();

-- review_replies: maintains reviews.reply_count / series_reviews.reply_count
-- (counts only non-deleted replies, so soft-delete also decrements).
CREATE OR REPLACE FUNCTION fn_review_replies_count_sync() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.deleted = false THEN
            IF NEW.target_type = 'MOVIE' THEN
                UPDATE reviews        SET reply_count = reply_count + 1 WHERE id = NEW.target_id;
            ELSIF NEW.target_type = 'SERIES' THEN
                UPDATE series_reviews SET reply_count = reply_count + 1 WHERE id = NEW.target_id;
            END IF;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.deleted = false THEN
            IF OLD.target_type = 'MOVIE' THEN
                UPDATE reviews        SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = OLD.target_id;
            ELSIF OLD.target_type = 'SERIES' THEN
                UPDATE series_reviews SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = OLD.target_id;
            END IF;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.deleted IS DISTINCT FROM NEW.deleted THEN
            -- soft-delete flip: adjust counter accordingly.
            IF NEW.deleted = true THEN
                IF OLD.target_type = 'MOVIE' THEN
                    UPDATE reviews        SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = OLD.target_id;
                ELSIF OLD.target_type = 'SERIES' THEN
                    UPDATE series_reviews SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = OLD.target_id;
                END IF;
            ELSE
                IF NEW.target_type = 'MOVIE' THEN
                    UPDATE reviews        SET reply_count = reply_count + 1 WHERE id = NEW.target_id;
                ELSIF NEW.target_type = 'SERIES' THEN
                    UPDATE series_reviews SET reply_count = reply_count + 1 WHERE id = NEW.target_id;
                END IF;
            END IF;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_review_replies_count
    AFTER INSERT OR UPDATE OR DELETE ON review_replies
    FOR EACH ROW EXECUTE FUNCTION fn_review_replies_count_sync();

-- review_reply_likes: maintains review_replies.like_count
CREATE OR REPLACE FUNCTION fn_review_reply_likes_count_sync() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE review_replies SET like_count = like_count + 1 WHERE id = NEW.reply_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE review_replies SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.reply_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_review_reply_likes_count
    AFTER INSERT OR DELETE ON review_reply_likes
    FOR EACH ROW EXECUTE FUNCTION fn_review_reply_likes_count_sync();
