# An RSVP keeps no history, so a changed answer can only be guessed from snapshots

Status: open
Area: guests / confirmation
Related: `docs/adr/0026-invited-and-coming-are-edited-apart.md`,
`docs/backlog/0034-a-co-owner-sees-less-than-the-creator.md`,
`supabase/migrations/20261014000000_collapse_rsvp_answer_runs.sql`

## The problem

`guests` holds an RSVP's current state only. Every write to `rsvp_status`, `amount` or
`meal_counts` overwrites the last one, and `CONTEXT.md` (RSVP Source) says so outright: "an
RSVP has one source, not a history". The only trace of an earlier answer is the snapshot
`recordGuestRsvp` writes to `guest_interactions` (`rsvp_confirm` / `rsvp_decline`, with
`guestCount`, `mealCounts` and `channel` in `metadata`). Those rows were built to feed the
per-Schedule funnel, not to be a history.

The Guests page's "Guests who changed their answer" export (⋯ menu, Reports) is built on
those snapshots, by choice, so it can ship without a schema change. The file says on its
first row which answers it can see. This item is the real fix.

## What the snapshots miss

- **The direct invitation link.** An answer through `guests.invitation_token` has no
  Schedule, and `recordGuestRsvp` writes a snapshot only when there is one
  (`guest_interactions.schedule_id` is `NOT NULL`).
- **Call Rounds.** `recordCallOutcome` overwrites `guests.amount` and status; `call_logs`
  keeps the outcome but not the count.
- **Owner edits.** `upsertGuest` overwrites the count and moves attribution to the Owner
  (ADR 0026); the Guest's earlier answer survives only as a snapshot, if they gave one
  through a Schedule.
- **Changes within one conversation.** `continuesAnswer` updates the latest snapshot in place
  for the same response on the same channel within 30 minutes, and the cleanup migration
  deleted the runs written before that. This is wanted - it is one answer being filled in.
- **Hard deletes** take the snapshots with the Guest Record (ADR 0025).

The export also skips a flip inside one conversation ("coming", then "not coming" a minute
later), since nobody acted on the first answer.

## Evidence

Event `caaa26b4-a49b-4ba6-a9f7-906d5734500a` (production, 2026-11-06): 536 Guest Records,
392 RSVP snapshots. 29 records' current answer differs from an earlier snapshot: 17 changed
by the Guest, 12 overridden by the Owner. How many changes went through the direct link or
a call cannot be counted - that is the gap.

## Option (recommended)

An append-only `guest_rsvp_changes` table written by an `after update` trigger on `guests`
whenever `rsvp_status`, `amount` or `meal_counts` changes: guest, event, old and new values,
`rsvp_change_source`, who, when. A trigger catches every writer - the chat, the RSVP page,
the direct link, calls, the Owner, the AI chat, bulk actions - without each having to
remember.

- Backfill from `guest_interactions` snapshots, marked as backfilled, since the oldest
  changes are only there.
- RLS: readable by every Owner of the Event (`user_has_event_access`), as
  `guest_interactions` is since `20261107000000_owners_read_outreach.sql`.
- Visitor decision (ADR 0028): planning data, so `visitor_open_tables()`.
- Then the export, and the guest drawer's Activity timeline, read the log instead of the
  snapshots, and the note on the file's first row goes.
- `CONTEXT.md`'s RSVP Source entry changes, and the decision gets an ADR.

## Checked and ruled out

- **Writing a snapshot for direct-link and call answers too.** Needs `schedule_id` nullable,
  and every new writer would still have to remember to do it. A trigger does not depend on
  the writer.
- **Reading Postgres's own history (WAL, PITR).** Not queryable from the app.

## Open questions

- Should a bulk RSVP change from the Guests page write one row per record? Probably yes,
  with the source `manual`.
- Retention: keep rows forever, or drop them with the Event?

## Done means

- Every RSVP change, from any writer, leaves a row, proved by a `db reset` check.
- The changed-answers export reads the log, with no gaps note.
- ADR written; `CONTEXT.md` RSVP Source updated.
