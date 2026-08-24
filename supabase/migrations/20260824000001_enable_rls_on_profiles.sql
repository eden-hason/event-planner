-- profiles was the only table in public with row level security switched off,
-- while anon and authenticated both held GRANT ALL on every column. Anyone
-- holding the publishable key could therefore read every user's email and
-- phone number, and - because assertAdmin() and the /admin proxy guard both
-- trust profiles.is_admin - set is_admin = true on their own row and walk into
-- the back office. pricing_plan was writable the same way.
--
-- Two separate holes, so two separate fixes: RLS decides which *rows* a user
-- reaches, and column privileges decide which *columns* they may write. RLS
-- alone would still leave a self-update free to flip is_admin, since row
-- policies cannot restrict columns.
--
-- Cross-user reads in the app (the admin back office, the impersonation
-- banner) all run through createServiceClient(), which bypasses RLS, so they
-- are unaffected. The one authenticated-client path that legitimately reads
-- other people's rows is the collaborate feature, which embeds profiles
-- through event_collaborators - hence the shared-event branch of the select
-- policy.

-- Mirrors the existing user_has_event_access / user_is_event_owner helpers:
-- security definer so the policy does not re-enter event_collaborators' own
-- RLS and recurse.
create or replace function public.user_shares_event_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.event_collaborators mine
    join public.event_collaborators theirs on theirs.event_id = mine.event_id
    where mine.user_id = auth.uid()
      and theirs.user_id = p_user_id
  )
$$;

grant execute on function public.user_shares_event_with(uuid) to authenticated;

alter table public.profiles enable row level security;

create policy "profiles_select_own_or_shared_event" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or public.user_shares_event_with(id)
  );

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No delete policy: profiles are removed by the cascade from auth.users, and
-- the admin paths that delete run as service_role.

-- anon has no business touching this table at all.
revoke all on table public.profiles from anon;

-- Re-grant to authenticated column by column. is_admin and pricing_plan are
-- deliberately absent from the write grants - they are set by service_role
-- only. created_at is left to its default.
revoke all on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
grant insert (id, full_name, avatar_url, email, phone_number, initial_setup_complete)
  on table public.profiles to authenticated;
grant update (id, full_name, avatar_url, email, phone_number, initial_setup_complete)
  on table public.profiles to authenticated;

do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass) then
    raise exception 'RLS was not enabled on public.profiles';
  end if;

  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'profiles') <> 3 then
    raise exception 'expected 3 policies on public.profiles, found %',
      (select count(*) from pg_policies where schemaname = 'public' and tablename = 'profiles');
  end if;

  if exists (
    select 1 from information_schema.table_privileges
    where table_schema = 'public' and table_name = 'profiles' and grantee = 'anon'
  ) then
    raise exception 'anon still holds privileges on public.profiles';
  end if;

  if exists (
    select 1 from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'profiles'
      and grantee = 'authenticated'
      and privilege_type in ('INSERT', 'UPDATE')
      and column_name in ('is_admin', 'pricing_plan')
  ) then
    raise exception 'authenticated can still write is_admin or pricing_plan';
  end if;
end $$;
