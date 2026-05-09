-- =====================================================================
-- V9  Half-star rating support.
--      Internal storage is doubled: stored = userValue * 2  (range 1..10).
--      DTO mapper exposes Double 0.5..5.0 in the API contract.
-- =====================================================================

-- Movies
ALTER TABLE reviews DROP CONSTRAINT reviews_rating_check;
UPDATE reviews SET rating = rating * 2;
ALTER TABLE reviews
    ADD CONSTRAINT reviews_rating_check CHECK (rating BETWEEN 1 AND 10);

-- Series
ALTER TABLE series_reviews DROP CONSTRAINT series_reviews_rating_check;
UPDATE series_reviews SET rating = rating * 2;
ALTER TABLE series_reviews
    ADD CONSTRAINT series_reviews_rating_check CHECK (rating BETWEEN 1 AND 10);
