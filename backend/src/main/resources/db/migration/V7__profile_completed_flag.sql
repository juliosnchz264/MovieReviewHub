-- =====================================================================
-- V7__profile_completed_flag.sql
-- Tracks whether a user has finished onboarding (chosen their own
-- nickname). Existing rows default to TRUE because they registered
-- locally and already picked a username. New OAuth2 sign-ups will be
-- created with profile_completed = FALSE so the frontend can force them
-- through a "Complete your profile" screen.
-- =====================================================================

ALTER TABLE users
    ADD COLUMN profile_completed BOOLEAN NOT NULL DEFAULT TRUE;
