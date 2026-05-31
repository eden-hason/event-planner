-- Swap one confirmation schedule onto the header-less follow-up template
-- (event 6605f31c-6e48-4677-879e-3fda6cf1635c). No-ops in environments where
-- the row does not exist, which is expected since this targets one event.
update public.schedules
set template_key = 'follow_up_confirmation_casual'
where id = 'a6d8322e-bba0-4882-ad77-6c8ee7ebf52a'
  and template_key = 'confirmation_casual_v1_he'; -- guard: only swap if still the original template
