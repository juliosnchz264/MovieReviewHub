-- =====================================================================
-- V11__user_profile_extended.sql
-- Profile redesign: handle, accent theme color, social links, locale
-- preferences (language, fallback language, country, timezone).
--
-- All fields are nullable except autodetect_timezone (defaults true).
-- handle is a case-insensitive optional alias and must stay unique
-- among active rows.
-- =====================================================================

ALTER TABLE users
    ADD COLUMN handle              VARCHAR(50),
    ADD COLUMN theme_color         VARCHAR(20),
    ADD COLUMN social_facebook     VARCHAR(255),
    ADD COLUMN social_instagram    VARCHAR(255),
    ADD COLUMN social_twitter      VARCHAR(255),
    ADD COLUMN social_tiktok       VARCHAR(255),
    ADD COLUMN default_language    VARCHAR(10),
    ADD COLUMN fallback_language   VARCHAR(10),
    ADD COLUMN country             VARCHAR(2),
    ADD COLUMN timezone            VARCHAR(64),
    ADD COLUMN autodetect_timezone BOOLEAN NOT NULL DEFAULT TRUE;

CREATE UNIQUE INDEX idx_users_handle_active
    ON users (LOWER(handle))
    WHERE deleted = FALSE AND handle IS NOT NULL;
