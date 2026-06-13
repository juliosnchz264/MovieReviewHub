-- =====================================================================
-- V26  Public identifiers: enforce phase.
--      Runs AFTER the V25 columns are backfilled for every existing row.
--      Locks in NOT NULL + UNIQUE and adds the lookup indexes so resolving
--      a request by slug / public_id is index-backed (no perf regression).
--      `person` already carries its UNIQUE constraints from V25.
-- =====================================================================

ALTER TABLE movies ALTER COLUMN slug SET NOT NULL;
ALTER TABLE movies ALTER COLUMN public_id SET NOT NULL;
ALTER TABLE series ALTER COLUMN slug SET NOT NULL;
ALTER TABLE series ALTER COLUMN public_id SET NOT NULL;
ALTER TABLE users  ALTER COLUMN public_id SET NOT NULL;

CREATE UNIQUE INDEX ux_movies_slug      ON movies(slug);
CREATE UNIQUE INDEX ux_movies_public_id ON movies(public_id);
CREATE UNIQUE INDEX ux_series_slug      ON series(slug);
CREATE UNIQUE INDEX ux_series_public_id ON series(public_id);
CREATE UNIQUE INDEX ux_users_public_id  ON users(public_id);
