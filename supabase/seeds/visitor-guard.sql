-- Not seed data: a check. Fails `npx supabase db reset` when any public table
-- with RLS on has no Visitor decision (ADR 0028).
--
-- Visitors are anonymous users and pass every `authenticated` policy, so a new
-- table is open to them unless someone decides otherwise. The migration that
-- introduced Visitors guards itself; this re-runs the same check after every
-- later migration, on the reset CLAUDE.md requires before production.
--
-- Decide in the new table's migration, one of:
--
--   * a Visitor may use it like an Owner (planning): add it to
--     public.visitor_open_tables()
--   * it reaches people or costs money: close it to Visitors, e.g.
--
--       create policy "Visitors cannot insert" on public.<table>
--         as restrictive for insert to authenticated
--         with check ((select public.is_visitor()) is false);
--
--     and the same `using (...)` for update and delete.
do $$
declare
  v_open text;
begin
  select string_agg(t, ', ') into v_open from public.tables_undecided_for_visitors() t;
  if v_open is not null then
    raise exception 'Tables with no Visitor decision (see supabase/seeds/visitor-guard.sql): %', v_open;
  end if;
end $$;
