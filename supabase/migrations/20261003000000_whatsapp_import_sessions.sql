-- One row per WhatsApp guest import session (backlog 0017, docs/whatsapp-import-plan.md).
--
-- The import links the Owner's WhatsApp as a short-lived device and reads their groups and
-- contacts. It first ran as one streaming request, but on a phone the Owner has to switch to
-- WhatsApp to enter the pairing code, and mobile browsers cut a backgrounded tab's
-- connections - the stream died exactly when it was needed. So the session now runs on its
-- own after the request that starts it (Next's `after`), and this row is where it reports:
-- the code, progress, and finally the groups and contacts, which the page polls and catches
-- up on when the Owner comes back.
--
-- The row is the only server-side trace of the session and is meant to be brief: the page
-- deletes it once it has read the result, deleting it early is how the Owner cancels (the
-- session watches for its row and unlinks when it is gone), and the Sweeper removes any row
-- past expires_at. The groups and contacts it holds are other people's names and numbers,
-- so nothing else should read or copy them.
--
-- Owners insert, read and delete their own rows. Only the session, through the service role,
-- updates them.

create table public.whatsapp_import_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  status text not null default 'requesting'
    check (status in ('requesting', 'code', 'linked', 'done', 'error')),
  -- The pairing code the Owner enters on their phone, while status = 'code'.
  code text,
  -- WhatsAppImportErrorReason, when status = 'error'.
  error text,
  -- WhatsAppGroup[] / WhatsAppPerson[] (src/features/guests/types.ts).
  groups jsonb,
  contacts jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Well past the session's own 270s deadline, so a finished result survives the Owner
  -- taking a while to come back from WhatsApp.
  expires_at timestamptz not null default now() + interval '15 minutes'
);

create index whatsapp_import_sessions_expires_at_idx
  on public.whatsapp_import_sessions (expires_at);

alter table public.whatsapp_import_sessions enable row level security;

create policy "Owners read their own WhatsApp import sessions"
  on public.whatsapp_import_sessions for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Owners start their own WhatsApp import sessions"
  on public.whatsapp_import_sessions for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Owners end their own WhatsApp import sessions"
  on public.whatsapp_import_sessions for delete
  to authenticated
  using (user_id = (select auth.uid()));

comment on table public.whatsapp_import_sessions is
  'Short-lived state of a WhatsApp linked-device guest import: code, progress and result. Deleted when read, cancelled or expired (backlog 0017).';
