# 4. Call schedules are plans, call rounds are executions

Date: 2026-08-14

## Status

Accepted

Supersedes [ADR-0001](0001-call-rounds-are-not-schedules.md).

## Context

ADR-0001 asked whether a phone call round should be a `schedules` row and
answered no. Three months of that answer held up fine, because the question it
was answering was "can an *ad hoc* round be a schedule". It cannot, and the
reasons given were sound.

The question has changed. Call rounds are no longer meant to be ad hoc. Every
event should *plan* its calling the same way it plans messages: a date, a time,
a target audience, chosen up front, visible to the Owner in the same timeline as
everything else. The back office then executes a plan that already exists rather
than inventing work out of nowhere.

That reframing dissolves ADR-0001's third objection outright. It said
`scheduled_date` "has no honest value for work that is started ad hoc rather
than planned". The whole point of this change is that the work stops being
started ad hoc, so the date becomes the most honest column on the row.

The first two objections are real and are solved below rather than waved away.

## Decision

A phone call round is split across the two tables that already exist, along the
seam between intent and execution.

- **`schedules`** gains a `phone_call` type. That row is the **plan**:
  `scheduled_date`, `scheduled_time`, `target_status`, and `template_id NULL`.
- **`call_rounds`** gains `schedule_id` and becomes the **execution record**.
- **`call_logs`** is untouched.

`schedules.status` keeps one meaning across both kinds: `NULL` is outstanding,
`'cancelled'` is called off, `'sent'` is dispatched. For a call plan,
"dispatched" is the moment an admin hits Start. Everything long-lived and
mutable about a round - outcomes arriving over days, `completed_at` - stays on
`call_rounds`, which no trigger and no cron touches.

That last point is what makes this work. ADR-0001 assumed the round's days-long
open state would have to live on the schedule row, and reasoned correctly that
"done" and "immutable" cannot be the same flag for it. They do not have to be.
The plan is terminal the moment it executes; the round is what stays open.

### Objection 1: the cron would send a call plan

`processScheduledMessages` selects any row with `status IS NULL` and
`scheduled_date <= now()`. `schedule_types` gains an `execution_kind` column
(`'message' | 'phone_call'`, default `'message'`), and the cron filters
**positively** on `execution_kind = 'message'`.

The filter is positive rather than excluding `phone_call`, so a kind nobody has
taught the cron about is inert by default instead of being blasted out over
WhatsApp. This is also why it is a catalog column and not a hardcoded key list:
`schedule_types` is a table precisely so it can grow, and a key list would make
every future non-message type a code change in the cron - the permanently
growing branch ADR-0001 was right to fear.

It is not a `template_id IS NOT NULL` filter either. That would encode
"templateless implies not-a-message" as folklore, and would silently swallow a
real bug: a message schedule that lost its template currently surfaces as a
logged `No template assigned` failure, and would instead vanish forever.

The same column carries one guard inside `sendSchedule`, placed after the parse
and before the claim. All four send entry points funnel through that engine, so
ADR-0001's "each is individually solvable with a branch, but together every
query grows a case" costs exactly one branch in one file.

### Objection 2: `prevent_sent_schedule_mutation` freezes sent rows

The invariant that trigger actually protects is "a message that physically went
out cannot be retroactively edited". It is guarded on a new
`schedule_type_is_message()` helper so it keeps protecting exactly that.

A call plan needs to stay mutable at `'sent'` because `deleteCallRound` exists to
undo a misclicked Start, and a frozen plan with its round deleted would be dead
work nobody could restart. The invariant that does matter for calls - one round
per plan - is carried by a unique index on `call_rounds.schedule_id` plus an
optimistic `status IS NULL` claim on Start, in the database, rather than by a
blanket freeze.

### Consequences that follow rather than being decided separately

- **The Owner is view-only on call plans**, enforced by two `RESTRICTIVE` RLS
  policies rather than by UI convention. INSERT is deliberately untouched, so the
  Owner still picks the date once in the setup wizard; after that the row belongs
  to the back office. Narrowing the freeze trigger is what makes this necessary:
  without it, `schedules_update` would let an Owner edit a dispatched plan.
- **The back office can add and reschedule call plans.** The wizard only renders
  from the schedules page empty state, so without an admin path an event that
  already has schedules could never acquire a call plan, and a wrong wizard date
  would be uncorrectable by anyone.
- **Every legacy `call_rounds` row is backfilled with the plan it would have
  had.** A round without a plan therefore does not exist, and the read model has
  exactly one shape - plan first, round optional - instead of a permanent
  orphan-round branch on every render.
- **`round_number` is deprecated.** Ordering now comes from the plan's
  `scheduled_date`. The column and its history stay; the `NOT NULL` and the
  `unique (event_id, round_number)` constraint go, which also removes the
  read-then-insert race two concurrent admins could hit.
- **`CALL_ROUNDS_NAV_KEY` and `OutreachItem.kind` are deleted.** Both existed only
  because call rounds had no catalog row. The nav key is now the real
  `phone_call` key, and the messages/calls grouping becomes derived from
  `execution_kind` rather than being the hardcoded position of a synthetic key.

## Consequences

**Good.** One table answers "what outreach does this event have", so the
schedules page stops assembling a union in application code and the nav ordering
is one sort over one query - the two costs ADR-0001 accepted. Calls inherit
planning, targeting and the Owner-facing timeline for free. `target_status`
replaces the hardcoded `rsvp_status = 'pending'` snapshot, so a round can target
confirmed guests without new code.

**Bad.** The freeze trigger and the cron are both conditional now, where before
they were unconditional. That is two pieces of load-bearing conditional logic
that did not exist, and both fail dangerously if the condition is ever inverted -
hence the positive cron filter and the `coalesce(..., true)` default in
`schedule_type_is_message`, which both fail toward "treat it as a message" only
where that is the safe direction.

**A deliberate widening of ADR-0001's visibility rule.** ADR-0001 granted call
data to the `owner` collaborator role only, not to every collaborator, so a
`seating_manager` scoped by `collaborator_guest_scope` never sees call data
outside their scope. `schedules_select` uses `user_has_event_access`, so the
*plan* row is now visible to every collaborator. This is accepted, not
overlooked: the plan carries a date, a time and a target status and no guest
data, and the results - `call_rounds`, `call_logs`, and the column-level revoke
on `notes` and `called_by` - remain under ADR-0001's narrower policies. If that
ever stops being acceptable, the fix is a third restrictive policy `for select`.

> Amended 2026-08-17: `notes` is no longer part of that revoke.
> `20260817000001_call_log_notes_visible_to_owner.sql` grants it back to
> `authenticated`, because what the caller learned on the phone is a result the
> host wants, not operator scratch space. `called_by` stays revoked, and the
> row-level narrowing described above is unchanged.

**If we change our mind.** Going back means dropping `schedule_id`, restoring the
unconditional trigger and cron, and deleting the `phone_call` plans while keeping
their rounds. The rounds and their logs are untouched by this change, so the
execution history survives a reversal intact. The plans are the disposable half.
