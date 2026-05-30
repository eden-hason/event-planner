create type call_outcome as enum ('no_answer', 'confirmed', 'declined', 'call_back', 'wrong_number');

create table call_rounds (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  round_number int not null,
  started_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, round_number)
);

create table call_logs (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references call_rounds(id) on delete cascade,
  guest_id uuid not null references guests(id) on delete cascade,
  outcome call_outcome,
  notes text,
  called_by uuid references auth.users(id),
  called_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (round_id, guest_id)
);

alter table call_rounds enable row level security;
alter table call_logs enable row level security;

create policy "Admins can manage call_rounds"
  on call_rounds
  for all
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

create policy "Admins can manage call_logs"
  on call_logs
  for all
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );
