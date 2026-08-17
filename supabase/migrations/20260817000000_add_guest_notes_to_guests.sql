-- Split the single guests.notes column by author.
--
-- Until now both the host (guest form in the app) and the guest (RSVP landing
-- page) wrote into guests.notes, so each source silently overwrote the other
-- and the landing page pre-filled its textarea with whatever private note the
-- host had typed. guest_notes gives the guest-authored comment its own column:
-- notes stays the host's working note, guest_notes is written only by the
-- confirmation flow.
--
-- Existing rows are left alone on purpose - the historical column holds a mix
-- of both authors and there is no way to tell them apart, so it all stays
-- under notes and guest_notes starts empty.

alter table public.guests
  add column if not exists guest_notes text;

comment on column public.guests.notes is
  'Host-authored note about the guest. Edited from the app guest form; never written by the RSVP landing page.';

comment on column public.guests.guest_notes is
  'Guest-authored comment submitted through the RSVP landing page. Read-only in the app.';
