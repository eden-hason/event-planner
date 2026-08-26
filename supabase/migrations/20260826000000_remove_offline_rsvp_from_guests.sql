-- Remove the offline RSVP feature.
--
-- The "offline RSVP" flag let hosts mark a guest confirmed/declined for someone
-- who had answered outside the app (e.g. by phone) before an invitation went
-- out, excluding them from capacity counts and confirmation follow-ups. The
-- feature has been removed from the application, so this column is no longer
-- read or written by any code, policy, view, or function.
alter table public.guests
  drop column if exists is_offline_rsvp;
