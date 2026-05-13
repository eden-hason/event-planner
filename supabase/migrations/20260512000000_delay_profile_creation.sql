-- Profiles are now created on first onboarding step (PersonalInfoStep) via upsert
-- from the application, rather than automatically at signup. Code paths that
-- depend on profile data already fall back to auth.users metadata when the row
-- is missing; invitation acceptance upserts a minimal profile to satisfy the
-- event_collaborators FK.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
