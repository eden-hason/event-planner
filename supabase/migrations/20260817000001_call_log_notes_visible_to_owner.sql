-- Make the note on a call log host-facing.
--
-- 20260811000000_call_rounds_owner_visibility.sql revoked select on call_logs
-- and re-granted every column except notes and called_by, on the reading that
-- the note was operator scratch space. It is not: the note is what the caller
-- learned on the phone ("arriving late", "checking with partner"), which is the
-- most useful thing a round produces for the host. The back office labels the
-- field as host-visible from now on, so operators write it knowing who reads it.
--
-- called_by stays revoked - which operator placed the call is internal.
--
-- Precondition, asserted below rather than assumed: no call_logs row has a note
-- yet, so nothing written under the old expectation of privacy is exposed by
-- this grant. If that stops being true before this reaches production the
-- migration fails, which is the point - those notes need reviewing first.

do $$
declare
  existing integer;
begin
  select count(*) into existing from public.call_logs where notes is not null;

  if existing > 0 then
    raise exception
      'call_logs has % row(s) with notes written while the column was operator-private; review them before granting the owner read access',
      existing;
  end if;
end $$;

grant select (notes) on public.call_logs to authenticated;

comment on column public.call_logs.notes is
  'What the caller learned on the phone. Host-facing: the event owner reads it on the call round results card. Not operator-private - called_by is.';
