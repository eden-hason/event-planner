CREATE UNIQUE INDEX IF NOT EXISTS gifts_event_guest_unique ON public.gifts (event_id, guest_id);
