-- =============================================================================
-- Promote Alfred Mukasa to staff admin (JWT app_metadata.role = 'admin')
-- Use when the account already exists in auth.users / public.profiles.
-- After push: that user signs out and signs in again so the JWT includes admin.
--
-- Matching covers common cases where full_name was never set or differs slightly.
-- If still 0 rows updated, run the manual UPDATE at the bottom with Alfred's email or UUID.
-- =============================================================================

UPDATE auth.users AS u
SET raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
WHERE
  -- Full name on the auth row (from signUp user_metadata)
  (
    regexp_replace(lower(trim(COALESCE(u.raw_user_meta_data->>'full_name', ''))), '\s+', ' ', 'g')
      ~ '(alfred.{0,40}mukasa|mukasa.{0,40}alfred)'
  )
  -- Mirror row from profiles trigger (may differ from metadata)
  OR EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = u.id
      AND regexp_replace(lower(trim(COALESCE(p.full_name, ''))), '\s+', ' ', 'g')
          ~ '(alfred.{0,40}mukasa|mukasa.{0,40}alfred)'
  )
  -- Email local-part patterns for "Alfred Mukasa" style addresses (already registered)
  OR lower(split_part(u.email, '@', 1)) ~ '(alfred.*mukasa|mukasa.*alfred|alfredmukasa|a\.mukasa)'
  OR lower(u.email) LIKE '%alfred%mukasa%'
  OR lower(u.email) LIKE '%mukasa%alfred%';

-- -----------------------------------------------------------------------------
-- Manual fallback (run in SQL Editor if the UPDATE above matched no rows):
--
-- By exact signup email:
--   UPDATE auth.users
--   SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
--   WHERE lower(email) = lower('paste-the-registered-email-here');
--
-- By user id (Authentication → Users → copy UUID):
--   UPDATE auth.users
--   SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
--   WHERE id = 'paste-uuid-here';
-- -----------------------------------------------------------------------------
