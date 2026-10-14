-- The Confirmation Conversation used to insert a guest_interactions row after
-- every step that writes - "Coming", the count, the meal, transportation - so
-- one answer given in the chat left a run of three to five rows, and the guest
-- drawer's Activity timeline showed each as its own answer.
--
-- recordGuestRsvp now updates the latest answer in place when the write
-- continues it (src/features/confirmation/utils/answer-run.ts): same response,
-- same channel, within 30 minutes of the last step. This collapses the rows
-- written before that by the same rule - a row is superseded when the next RSVP
-- row for the same Guest and Schedule continues it - keeping the last row of
-- each run, which holds where the Guest ended up and the time of the last step.
--
-- Only superseded snapshots go. The answer itself lives on public.guests and is
-- untouched; every reader of these rows already takes the latest one.

create temporary table rsvp_answer_pairs_before on commit drop as
select distinct guest_id, schedule_id
  from public.guest_interactions
 where interaction_type in ('rsvp_confirm', 'rsvp_decline');

with ordered as (
  select id,
         interaction_type,
         metadata ->> 'channel' as channel,
         created_at,
         lead(interaction_type) over w as next_type,
         lead(metadata ->> 'channel') over w as next_channel,
         lead(created_at) over w as next_at
    from public.guest_interactions
   where interaction_type in ('rsvp_confirm', 'rsvp_decline')
  window w as (partition by guest_id, schedule_id order by created_at, id)
)
delete from public.guest_interactions gi
 using ordered o
 where gi.id = o.id
   and o.next_type = o.interaction_type
   and o.next_channel is not distinct from o.channel
   and o.next_at - o.created_at <= interval '30 minutes';

-- Fail the migration rather than leave a run behind, or a Guest and Schedule
-- that had an answer with none.
do $$
declare
  v_runs int;
  v_lost int;
begin
  select count(*) into v_runs
    from (
      select interaction_type,
             metadata ->> 'channel' as channel,
             created_at,
             lead(interaction_type) over w as next_type,
             lead(metadata ->> 'channel') over w as next_channel,
             lead(created_at) over w as next_at
        from public.guest_interactions
       where interaction_type in ('rsvp_confirm', 'rsvp_decline')
      window w as (partition by guest_id, schedule_id order by created_at, id)
    ) o
   where o.next_type = o.interaction_type
     and o.next_channel is not distinct from o.channel
     and o.next_at - o.created_at <= interval '30 minutes';

  if v_runs > 0 then
    raise exception 'collapse_rsvp_answer_runs: % answer rows still continue the next one', v_runs;
  end if;

  select count(*) into v_lost
    from rsvp_answer_pairs_before b
   where not exists (
     select 1
       from public.guest_interactions gi
      where gi.guest_id = b.guest_id
        and gi.schedule_id = b.schedule_id
        and gi.interaction_type in ('rsvp_confirm', 'rsvp_decline')
   );

  if v_lost > 0 then
    raise exception 'collapse_rsvp_answer_runs: % guest/schedule pairs lost their answer', v_lost;
  end if;
end $$;
