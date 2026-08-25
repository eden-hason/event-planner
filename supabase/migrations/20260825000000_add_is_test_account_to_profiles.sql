-- Several accounts running against production belong to the team rather than to
-- customers: they exist to exercise the real app, and their events and guest
-- records inflate every number the Back Office reports. An Operator reading
-- "1,011 guest records" needs that to be 1,011 real ones.
--
-- The flag lives on profiles rather than in code because the set changes -
-- marking a new test account is a row update, not a redeploy. It is deliberately
-- not an email pattern: the accounts already exist and their addresses are not
-- shaped alike.
--
-- This column is only the storage. The Back Office reads through
-- createServiceClient(), which bypasses RLS, so the filtering it drives lives in
-- src/features/admin/queries/test-accounts.ts. Nothing in the customer-facing
-- app reads it.
--
-- Writable by service_role only, and it takes no new grant to get there:
-- 20260824000001_enable_rls_on_profiles.sql re-granted profiles column by
-- column, and its insert/update grants name columns explicitly, so a column
-- added later is unwritable by authenticated. Readable like is_admin - a user
-- learning their own account is flagged discloses nothing.

alter table public.profiles
  add column if not exists is_test_account boolean not null default false;

comment on column public.profiles.is_test_account is
  'Team-owned account used to exercise production. Excluded from Back Office counts and lists.';

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'is_test_account'
  ) then
    raise exception 'is_test_account was not added to public.profiles';
  end if;

  if exists (
    select 1 from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'profiles'
      and grantee = 'authenticated'
      and privilege_type in ('INSERT', 'UPDATE')
      and column_name = 'is_test_account'
  ) then
    raise exception 'authenticated can write is_test_account';
  end if;
end $$;
