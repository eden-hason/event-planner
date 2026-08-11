# 1. Call rounds are not schedules

Date: 2026-08-11

## Status

Accepted

## Context

Phone call rounds were invisible to Owners: `call_rounds` and `call_logs` were
readable only by admins, and the only UI was the back office. Owners could see
that guests had confirmed, but not that a person had phoned them to make it
happen.

We wanted call rounds to appear on the Owner's schedules page alongside message
schedules. The obvious route was to make a call round *be* a schedule: add a
`phone_call` row to the `schedule_types` catalog and insert one `schedules` row
per round. The nav, the layout, and the status rendering would then work with
no changes at all.

Three things in the existing system argued against it:

1. `processScheduledMessages` selects **any** `schedules` row with
   `status IS NULL` and `scheduled_date <= now()` and hands it to the send
   engine. A call round row would be picked up by the cron and attempted as a
   message send. Preventing that means teaching the cron about rows that are
   not messages.
2. The `prevent_sent_schedule_mutation` trigger freezes a schedule row once
   `status = 'sent'`. A call round stays open for days while outcomes come in,
   so "done" and "immutable" cannot be the same flag for it.
3. `schedules.template_id` and the derived `deliveryMethod` are meaningless for
   a round, and `scheduled_date` has no honest value for work that is started
   ad hoc rather than planned.

Each is individually solvable with a branch. Together they mean every query,
the setup wizard, the execute route, and the send engine would grow a "not a
real message" case, permanently.

## Decision

Call rounds keep their own tables and their own lifecycle. The two kinds are
unified in the **read model**: the schedules page queries both and builds a
list of `OutreachItem`s (`kind: 'message' | 'call_round'`), which the nav and
status row render identically.

`Schedule` keeps its current, narrow meaning - a planned, templated message
send. The wider concept is called an **Outreach Item**, and lives in
`src/features/schedules/types.ts`. The call domain itself lives in
`src/features/calls/`.

Consequences that follow from this rather than being decided separately:

- Round completion is explicit (`call_rounds.completed_at`) instead of derived
  from log outcomes, because a round can legitimately end with guests still
  unreached.
- Owner access is granted by new SELECT policies rather than inherited from
  `schedules_select`, which let us make it deliberately narrower - the `owner`
  collaborator role only, not every collaborator.

## Consequences

**Good.** No cron guard, no trigger conflict, no null-template branches. Call
rounds can grow call-specific fields without touching the schedules model, and
the existing schedule paths are entirely unchanged by this feature.

**Bad.** The schedules page runs a second query and assembles the union in
application code, and the nav's ordering rule is now "message types in catalog
order, then call rounds" rather than one sort over one table. Anything that
wants to reason over *all* outreach - an activity timeline, an export - has to
go through the read model rather than a single SQL query.

**If we change our mind.** Moving to a unified table later means backfilling
`schedules` rows from `call_rounds` and solving the three problems above. The
read-model union is the cheaper thing to undo, which is why it goes first.
