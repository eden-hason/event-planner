-- Create expenses table
CREATE TABLE public.expenses (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id        uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  emoji           text        NOT NULL DEFAULT '💸',
  vendor          text,
  estimate        numeric     NOT NULL DEFAULT 0,
  fully_paid      boolean     NOT NULL DEFAULT false,
  has_advance     boolean     NOT NULL DEFAULT false,
  advance_amount  numeric     NOT NULL DEFAULT 0,
  advance_paid    boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_select" ON public.expenses FOR SELECT TO authenticated
  USING (event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid()) OR public.user_has_event_access(event_id));

CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid()) OR public.user_is_event_owner(event_id));

CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE TO authenticated
  USING (event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid()) OR public.user_is_event_owner(event_id));

CREATE POLICY "expenses_delete" ON public.expenses FOR DELETE TO authenticated
  USING (event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid()) OR public.user_is_event_owner(event_id));

-- Create gifts table
CREATE TABLE public.gifts (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id    uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  guest_id    uuid        REFERENCES public.guests(id) ON DELETE SET NULL,
  guest_name  text        NOT NULL,
  amount      numeric     NOT NULL DEFAULT 0,
  is_received boolean     NOT NULL DEFAULT false,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gifts_select" ON public.gifts FOR SELECT TO authenticated
  USING (event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid()) OR public.user_has_event_access(event_id));

CREATE POLICY "gifts_insert" ON public.gifts FOR INSERT TO authenticated
  WITH CHECK (event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid()) OR public.user_is_event_owner(event_id));

CREATE POLICY "gifts_update" ON public.gifts FOR UPDATE TO authenticated
  USING (event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid()) OR public.user_is_event_owner(event_id));

CREATE POLICY "gifts_delete" ON public.gifts FOR DELETE TO authenticated
  USING (event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid()) OR public.user_is_event_owner(event_id));
