-- Drop events.landing_template_id, the Owner's pick from the Templates page
-- (20260521000000).
--
-- The Templates page and its designs are gone: every Event's guest-facing page
-- uses the one built-in Invitation Design, so the stored pick has nothing left
-- to select. Nothing in the app, a view, a policy, an index or a function
-- references the column any more. The values it holds are discarded on purpose -
-- they name designs that no longer exist.
--
-- Push this only after the deploy that removes the Templates page is live: the
-- version before it still writes this column when an Owner picks a design.

alter table public.events drop column if exists landing_template_id;
