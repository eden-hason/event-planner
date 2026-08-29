-- Rebuild the Seating Plan on enforceable foundations.
--
-- The old `tables` relation was a canvas prop: it carried a free-angle rotation nothing
-- ever rendered, a 1..100 capacity range nothing ever checked, and no notion at all that a
-- Table can be overbooked. Capacity was a visual state - a red ring - and every write
-- path was free to ignore it.
--
-- ADR-0008 makes capacity a hard invariant and requires it "at the database boundary",
-- because the Seating Plan is not the only writer: the Guest Directory, the Back Office,
-- and the RSVP link all set `guests.table_id` or `guests.rsvp_status` without going
-- anywhere near a Server Action. ADR-0009 settles what a Table is - a seat diagram whose
-- `shape` and `rotation` together drive geometry - and fixes the capacity range at the
-- 2..24 a drawn diagram can actually stay readable within. Rotation is constrained to
-- quarter turns: the footprint a rotated Table occupies has to stay computable, and an
-- arbitrary angle is what made the old column decorative rather than load-bearing.
--
-- There is no production seating data, so `tables` is recreated rather than patched. The
-- five routines below are the whole point of the migration:
--   guests_seating_guard    - no assignment may exceed capacity; declining releases the seat
--   tables_capacity_guard   - capacity may never drop below current occupancy
--   tables_delete_guard     - a Seating Manager may not delete a Table holding guests they
--                             cannot see (ADR-0008), without revealing who those guests are
--   event_table_occupancy   - truthful totals plus a visible/total split, so a scoped
--                             collaborator sees real remaining capacity but no identities
--   event_seating_progress  - identity-free Event-wide progress totals, so a scoped
--                             Seating Manager cannot read 100% while confirmed records
--                             outside their scope are still unseated (ADR-0008)
--   assign_guests_to_table  - one atomic all-or-nothing assignment that reports party size,
--                             places left, and shortfall instead of failing blankly
--
-- The guards are SECURITY DEFINER on purpose. Under RLS a Seating Manager cannot select
-- out-of-scope guests, so an invoker-rights occupancy count would understate the Table and
-- let them overbook it. Capacity validation always uses total occupancy.

-- ---------------------------------------------------------------------------
-- 1. Recreate `tables`
-- ---------------------------------------------------------------------------

update public.guests set table_id = null where table_id is not null;

-- cascade drops guests.table_id's foreign key; the column and its index survive
drop table if exists public.tables cascade;

-- public.table_shape ('round', 'rectangle', 'square') predates this migration and is kept
do $$
begin
  if not exists (select 1 from pg_type where typname = 'table_shape') then
    create type public.table_shape as enum ('round', 'rectangle', 'square');
  end if;
end$$;

create table public.tables (
  id           uuid        primary key default gen_random_uuid(),
  event_id     uuid        not null references public.events(id) on delete cascade,
  table_number int         not null,
  label        text        null,
  shape        public.table_shape not null default 'round',
  capacity     int         not null default 10,
  rotation     smallint    not null default 0,
  position_x   real        not null default 0,
  position_y   real        not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint tables_number_positive check (table_number > 0 and table_number <= 999),
  constraint tables_label_length    check (label is null or char_length(label) <= 50),
  constraint tables_capacity_range  check (capacity >= 2 and capacity <= 24),
  constraint tables_rotation_quarter check (rotation in (0, 90, 180, 270)),
  constraint tables_event_number_unique unique (event_id, table_number)
);

create index idx_tables_event_id on public.tables(event_id);

create trigger update_tables_updated_at before update on public.tables
  for each row execute function public.update_updated_at_column();

alter table public.guests
  add constraint guests_table_id_fkey
  foreign key (table_id) references public.tables(id) on delete set null;

create index if not exists idx_guests_table_id on public.guests(table_id);

-- ---------------------------------------------------------------------------
-- 2. RLS - unchanged in spirit: every collaborator sees and manages every Table.
--    Restricting Tables themselves would fragment one capacity-constrained plan
--    (ADR-0008). What a Seating Manager may not do is delete a Table holding
--    guests outside their scope, which is a trigger's job, not a policy's - a
--    policy can only make the row invisible, and it must stay visible.
-- ---------------------------------------------------------------------------

alter table public.tables enable row level security;

create policy "tables_select" on public.tables for select to authenticated
  using (event_id in (select id from public.events where user_id = auth.uid())
         or public.user_has_event_access(event_id));

create policy "tables_insert" on public.tables for insert to authenticated
  with check (event_id in (select id from public.events where user_id = auth.uid())
              or public.user_has_event_access(event_id));

create policy "tables_update" on public.tables for update to authenticated
  using (event_id in (select id from public.events where user_id = auth.uid())
         or public.user_has_event_access(event_id))
  with check (event_id in (select id from public.events where user_id = auth.uid())
              or public.user_has_event_access(event_id));

create policy "tables_delete" on public.tables for delete to authenticated
  using (event_id in (select id from public.events where user_id = auth.uid())
         or public.user_has_event_access(event_id));

-- ---------------------------------------------------------------------------
-- 3. Capacity is a hard invariant on the guest side
-- ---------------------------------------------------------------------------

create or replace function public.guests_seating_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity int;
  v_occupied int;
  v_incoming int;
begin
  -- ADR-0008: declining ends the assignment immediately. Doing it here rather than in
  -- the form is what makes it true for the Back Office and the RSVP link too, and it is
  -- why reconfirming later returns the record to Unassigned instead of restoring a Table.
  if new.rsvp_status = 'declined' then
    new.table_id := null;
    return new;
  end if;

  if new.table_id is null then
    return new;
  end if;

  -- Nothing that consumes capacity changed. A row coming back from declined always
  -- fails this test, because declining nulled its table_id on the way out.
  if tg_op = 'UPDATE'
     and old.table_id is not distinct from new.table_id
     and coalesce(old.amount, 1) = coalesce(new.amount, 1)
     and old.rsvp_status <> 'declined' then
    return new;
  end if;

  -- The row lock is what makes this an invariant rather than a race: two clients
  -- assigning into the same Table serialize here instead of both reading "2 free".
  select capacity into v_capacity
  from public.tables
  where id = new.table_id
  for update;

  if v_capacity is null then
    raise exception 'seating_table_not_found' using errcode = '23503';
  end if;

  select coalesce(sum(coalesce(g.amount, 1)), 0) into v_occupied
  from public.guests g
  where g.table_id = new.table_id
    and g.rsvp_status <> 'declined'
    and g.id <> new.id;

  v_incoming := coalesce(new.amount, 1);

  if v_occupied + v_incoming > v_capacity then
    raise exception 'seating_over_capacity: party=% free=% shortfall=%',
      v_incoming,
      greatest(v_capacity - v_occupied, 0),
      v_occupied + v_incoming - v_capacity
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger guests_seating_guard
  before insert or update of table_id, amount, rsvp_status on public.guests
  for each row execute function public.guests_seating_guard();

-- ---------------------------------------------------------------------------
-- 4. Capacity may not be reduced below current occupancy
-- ---------------------------------------------------------------------------

create or replace function public.tables_capacity_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_occupied int;
begin
  if new.capacity >= old.capacity then
    return new;
  end if;

  select coalesce(sum(coalesce(amount, 1)), 0) into v_occupied
  from public.guests
  where table_id = new.id
    and rsvp_status <> 'declined';

  if new.capacity < v_occupied then
    raise exception 'seating_capacity_below_occupancy: occupancy=% requested=%',
      v_occupied, new.capacity
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger tables_capacity_guard
  before update of capacity on public.tables
  for each row execute function public.tables_capacity_guard();

-- ---------------------------------------------------------------------------
-- 5. A Seating Manager may not delete a Table holding guests they cannot see
-- ---------------------------------------------------------------------------

create or replace function public.tables_delete_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_collaborator_id uuid;
  v_out_of_scope int;
begin
  -- Owners delete freely; the impact confirmation is the interface's job.
  if exists (select 1 from public.events e where e.id = old.event_id and e.user_id = auth.uid())
     or exists (select 1 from public.event_collaborators ec
                where ec.event_id = old.event_id and ec.user_id = auth.uid() and ec.role = 'owner') then
    return old;
  end if;

  select ec.id into v_collaborator_id
  from public.event_collaborators ec
  where ec.event_id = old.event_id
    and ec.user_id = auth.uid()
    and ec.role = 'seating_manager'
  limit 1;

  if v_collaborator_id is null then
    return old;
  end if;

  select count(*) into v_out_of_scope
  from public.guests g
  where g.table_id = old.id
    and not exists (
      select 1
      from public.collaborator_guest_scope cgs
      where cgs.collaborator_id = v_collaborator_id
        and (cgs.guest_id = g.id or cgs.group_id = g.group_id)
    );

  -- Deliberately reports only that the block exists, never who caused it.
  if v_out_of_scope > 0 then
    raise exception 'seating_delete_out_of_scope' using errcode = 'P0001';
  end if;

  return old;
end;
$$;

create trigger tables_delete_guard
  before delete on public.tables
  for each row execute function public.tables_delete_guard();

-- ---------------------------------------------------------------------------
-- 6. Truthful occupancy without leaking identity (ADR-0008, ADR-0009)
-- ---------------------------------------------------------------------------

create or replace function public.guest_in_collaborator_scope(
  p_collaborator_id uuid,
  p_guest_id uuid,
  p_group_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_collaborator_id is not null and exists (
    select 1
    from public.collaborator_guest_scope cgs
    where cgs.collaborator_id = p_collaborator_id
      and (cgs.guest_id = p_guest_id or cgs.group_id = p_group_id)
  );
$$;

create or replace function public.event_table_occupancy(p_event_id uuid)
returns table (
  table_id             uuid,
  confirmed_heads      int,
  pending_heads        int,
  record_count         int,
  visible_record_count int,
  visible_heads        int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sees_all boolean;
  v_collaborator_id uuid;
  -- The Back Office reaches an Event through the service client while
  -- impersonating, so auth.uid() is null there. It already bypasses RLS
  -- everywhere else; refusing it here would render every Table empty rather
  -- than deny anything.
  v_service boolean := auth.role() = 'service_role';
begin
  if not (
    v_service
    or exists (select 1 from public.events e where e.id = p_event_id and e.user_id = auth.uid())
    or public.user_has_event_access(p_event_id)
  ) then
    raise exception 'not authorized for event %', p_event_id using errcode = '42501';
  end if;

  v_sees_all :=
    v_service
    or exists (select 1 from public.events e where e.id = p_event_id and e.user_id = auth.uid())
    or exists (select 1 from public.event_collaborators ec
               where ec.event_id = p_event_id and ec.user_id = auth.uid() and ec.role = 'owner');

  select ec.id into v_collaborator_id
  from public.event_collaborators ec
  where ec.event_id = p_event_id
    and ec.user_id = auth.uid()
    and ec.role = 'seating_manager'
  limit 1;

  return query
  select
    t.id,
    coalesce(sum(case when g.rsvp_status = 'confirmed' then coalesce(g.amount, 1) end), 0)::int,
    coalesce(sum(case when g.rsvp_status = 'pending'   then coalesce(g.amount, 1) end), 0)::int,
    count(g.id)::int,
    count(g.id) filter (where v_sees_all or public.guest_in_collaborator_scope(v_collaborator_id, g.id, g.group_id))::int,
    -- `g.id is not null` matters: the left join emits a null row for an empty
    -- Table, and coalesce(g.amount, 1) would score that phantom guest as one head.
    coalesce(sum(coalesce(g.amount, 1)) filter (
      where g.id is not null
        and (v_sees_all or public.guest_in_collaborator_scope(v_collaborator_id, g.id, g.group_id))
    ), 0)::int
  from public.tables t
  left join public.guests g
    on g.table_id = t.id
   and g.rsvp_status <> 'declined'
  where t.event_id = p_event_id
  group by t.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6b. Event-wide plan progress, counted without identities (ADR-0008, ADR-0009)
--
-- Progress must be measured against every confirmed Guest Record in the Event,
-- not the RLS-filtered slice a Seating Manager can select - otherwise a scoped
-- collaborator reads 100% while confirmed records they cannot see sit unseated.
-- SECURITY DEFINER for the same reason event_table_occupancy is: the whole
-- point is to count rows the caller is not allowed to read. It returns only
-- aggregate numbers - never a name, never a guest id.
-- ---------------------------------------------------------------------------

create or replace function public.event_seating_progress(p_event_id uuid)
returns table (
  confirmed_records_total  int,
  confirmed_records_seated int,
  confirmed_heads_total    int,
  confirmed_heads_seated   int,
  pending_heads_unseated   int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service boolean := auth.role() = 'service_role';
begin
  if not (
    v_service
    or exists (select 1 from public.events e where e.id = p_event_id and e.user_id = auth.uid())
    or public.user_has_event_access(p_event_id)
  ) then
    raise exception 'not authorized for event %', p_event_id using errcode = '42501';
  end if;

  return query
  select
    count(*) filter (where g.rsvp_status = 'confirmed')::int,
    count(*) filter (where g.rsvp_status = 'confirmed' and g.table_id is not null)::int,
    coalesce(sum(coalesce(g.amount, 1)) filter (where g.rsvp_status = 'confirmed'), 0)::int,
    coalesce(sum(coalesce(g.amount, 1)) filter (
      where g.rsvp_status = 'confirmed' and g.table_id is not null
    ), 0)::int,
    coalesce(sum(coalesce(g.amount, 1)) filter (
      where g.rsvp_status = 'pending' and g.table_id is null
    ), 0)::int
  from public.guests g
  where g.event_id = p_event_id
    and g.rsvp_status <> 'declined';
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Atomic assignment that can explain itself
-- ---------------------------------------------------------------------------

-- A Table's real occupancy, including Guest Records the caller cannot see.
--
-- SECURITY DEFINER because that is the entire point: a scoped Seating Manager
-- validating against only their own visible guests would overbook the Table.
-- It therefore checks Event access itself, rather than relying on the RLS it
-- is deliberately stepping around.
create or replace function public.table_occupied_heads(p_table_id uuid, p_exclude uuid[] default '{}'::uuid[])
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_heads int;
begin
  select event_id into v_event_id from public.tables where id = p_table_id;
  if v_event_id is null then
    return 0;
  end if;

  if not (
    auth.role() = 'service_role'
    or exists (select 1 from public.events e where e.id = v_event_id and e.user_id = auth.uid())
    or public.user_has_event_access(v_event_id)
  ) then
    raise exception 'not authorized for event %', v_event_id using errcode = '42501';
  end if;

  select coalesce(sum(coalesce(g.amount, 1)), 0)::int into v_heads
  from public.guests g
  where g.table_id = p_table_id
    and g.rsvp_status <> 'declined'
    and not (g.id = any(p_exclude));

  return v_heads;
end;
$$;

create or replace function public.assign_guests_to_table(
  p_event_id uuid,
  p_guest_ids uuid[],
  p_table_id uuid
)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_capacity int;
  v_occupied int;
  v_party int;
  v_records int;
  v_free int;
  v_updated int;
begin
  -- Unassign needs no capacity check; RLS still decides which guests may be touched.
  if p_table_id is null then
    update public.guests
    set table_id = null
    where id = any(p_guest_ids)
      and event_id = p_event_id;
    get diagnostics v_updated = row_count;
    return v_updated;
  end if;

  select capacity into v_capacity
  from public.tables
  where id = p_table_id
    and event_id = p_event_id
  for update;

  if v_capacity is null then
    raise exception 'seating_table_not_found' using errcode = 'P0002';
  end if;

  -- SECURITY DEFINER helper: a scoped collaborator must validate against the Table's
  -- real occupancy, not merely the guests they are allowed to see.
  v_occupied := public.table_occupied_heads(p_table_id, p_guest_ids);

  select coalesce(sum(coalesce(amount, 1)), 0), count(*)
    into v_party, v_records
  from public.guests
  where id = any(p_guest_ids)
    and event_id = p_event_id
    and rsvp_status <> 'declined';

  if v_records = 0 then
    raise exception 'seating_no_assignable_records' using errcode = 'P0001';
  end if;

  v_free := v_capacity - v_occupied;

  -- All or nothing: the whole selection fits, or none of it moves.
  if v_party > v_free then
    raise exception 'seating_over_capacity: party=% free=% shortfall=% records=%',
      v_party, greatest(v_free, 0), v_party - v_free, v_records
      using errcode = 'P0001';
  end if;

  update public.guests
  set table_id = p_table_id
  where id = any(p_guest_ids)
    and event_id = p_event_id
    and rsvp_status <> 'declined';

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

grant execute on function public.event_table_occupancy(uuid) to authenticated;
grant execute on function public.event_seating_progress(uuid) to authenticated;
grant execute on function public.assign_guests_to_table(uuid, uuid[], uuid) to authenticated;

-- Left with the default PUBLIC execute, this SECURITY DEFINER helper would let
-- any signed-in user probe another collaborator's scope.
-- guest_in_collaborator_scope is only ever called from inside
-- event_table_occupancy, which runs as the owner, so no client needs it.
revoke execute on function public.guest_in_collaborator_scope(uuid, uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8. Refuse to land half-built. Every rule above is the reason this migration
--    exists, so a missing one is a failure, not a warning.
-- ---------------------------------------------------------------------------

do $$
declare
  v_missing text[] := '{}';
begin
  if not exists (select 1 from pg_constraint where conname = 'guests_table_id_fkey') then
    v_missing := v_missing || 'guests.table_id foreign key';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'guests_seating_guard') then
    v_missing := v_missing || 'guests_seating_guard';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'tables_capacity_guard') then
    v_missing := v_missing || 'tables_capacity_guard';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'tables_delete_guard') then
    v_missing := v_missing || 'tables_delete_guard';
  end if;
  if not exists (select 1 from pg_proc where proname = 'event_table_occupancy') then
    v_missing := v_missing || 'event_table_occupancy';
  end if;
  if not exists (select 1 from pg_proc where proname = 'event_seating_progress') then
    v_missing := v_missing || 'event_seating_progress';
  end if;
  if not exists (select 1 from pg_proc where proname = 'assign_guests_to_table') then
    v_missing := v_missing || 'assign_guests_to_table';
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tables_rotation_quarter') then
    v_missing := v_missing || 'tables_rotation_quarter';
  end if;

  if array_length(v_missing, 1) is not null then
    raise exception 'seating rebuild incomplete: %', array_to_string(v_missing, ', ');
  end if;
end$$;
