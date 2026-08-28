# 7. The Back Office is a second writer of the guest list

Date: 2026-08-28

## Status

Accepted

## Context

The guest list has always belonged to the Owner. Three things write an RSVP
today, and `guests.rsvp_change_source` names each of them:

- `guest` - the Guest answered the link themselves
- `manual` - the Owner typed it in
- `admin_call` - a Kululu Operator recorded a Call Outcome during a Call Round

The Back Office appears in that list exactly once, and only through a Call
Round. That was not an accident of implementation. It meant every
Operator-set RSVP was attributable to a specific call, on a specific date, to a
specific Guest, and the "where the answers came from" table on the Event page
could be trusted because each row named a real writer.

Membership of the list - which Guest Records exist at all - had only one writer.
That matters more than it looks, because `CONTEXT.md` defines the Guest Record
as **the unit of billing**. Kululu is priced per Guest Record. A row is money.

The Back Office is now getting a per-guest table, and the question is what an
Operator may do from it.

The pull toward writing is real. An Operator on the phone with an Owner, or
looking at a guest whose number is malformed and whose sends will therefore all
fail, currently has one option: impersonate the Owner and fix it in the
product. That works, but it is a lens designed for seeing, being used for
doing.

## Decision

The Back Office guest table is a **full second writer of the guest list**.
An Operator may edit any field on a Guest Record, and may add and delete Guest
Records.

Editing happens in a **`?guest=<id>` sheet**, not in table cells. The table
stays a plain fast read surface. The sheet is where the fields, the notes, and
that Guest's call history across every round sit together, and its URL is
shareable between Operators. This reuses the `?user=` sheet pattern already
tuned on the Users index, including its Suspense shape.

Deletion is a hard delete mirroring the Owner's own `deleteGuest`, behind a
confirm that states the billing consequence in words.

### `rsvp_change_source` gains a fourth value

An Operator setting an RSVP with no call behind it is none of the three existing
writers. Writing `manual` would make the page report "Owner typed it in" about
something the Owner did not do. Writing `admin_call` would claim a call that
never happened, and would leave an `admin_call` RSVP with no `call_log` behind
it.

So the CHECK constraint on `guests.rsvp_change_source` widens to admit
`admin_edit`, rendered as **"Operator typed it in"**. This is the same shape of
change as `20260530000002_add_admin_call_rsvp_source.sql`, which added
`admin_call` for the same kind of reason.

The provenance table therefore keeps telling the truth, and gains an honest
fourth row.

## Consequences

**The billing unit has two writers and no reconciliation between them.** This is
the real cost and it is accepted rather than solved. If an Owner disputes their
guest record count, there is no record of whether an Operator added or removed
rows. The mitigations are weak on purpose, because the alternative was to keep
the Back Office read-only and lose the capability:

- Provenance makes RSVP writes visible in aggregate, so bypassing a Call Round
  is at least *measurable* on the page itself
- Add and delete are not visible anywhere, in aggregate or otherwise

If that becomes a support problem, the fix is an activity log, deliberately
deferred here. A narrower `rsvp_changed_by` actor column was considered and
rejected as a half-measure: it would answer "who" for RSVP only, and only for
the most recent change, while saying nothing about the rows that stopped
existing.

**"Operator typed it in" is the number to watch.** If it grows relative to
"Operator on the phone", the Call Round has stopped being how Kululu touches
guests, and this decision is quietly changing what the service is. Today's
distribution is 170 answers from calls against 62 from the Owner, out of 1,324
Guest Records, so the new row starts at zero and any movement is legible.

**Impersonation stops being the only doing-path.** It remains available and
remains the honest way to act *as the Owner*. The distinction sharpens: an
Operator impersonates when the Owner should be the author of the change, and
uses the Back Office when Kululu is.

**Three glossary entries were wrong and are amended.** `Operator` listed the
work an Operator does and no longer covered it. `Call Outcome` said a Guest could
be confirmed without a Call Outcome only by answering themselves, and there is
now a second way. `Guest Record` defined the billing unit without saying who may
create and destroy one.

**If we change our mind.** Narrowing back to read-only is cheap in code: remove
the mutations, keep the sheet as a detail view. The `admin_edit` rows already
written stay as accurate history of a period when the rule was different, which
is exactly why the fourth provenance value is worth the migration even if the
capability is later withdrawn.
