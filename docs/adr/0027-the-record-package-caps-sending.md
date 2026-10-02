# The Record Package caps sending, not planning

Date: 2026-10-02

## Status

Accepted. Partly supersedes ADR 0002 ("no ceiling"), amends ADR 0021 (`comped` retires),
and closes the open question in ADR 0024 (where Bonus Records are granted).

## Context

The homepage sells Guest Records at a per-channel rate, with Bonus Records on top (ADR 0024).
The purchase itself happens outside the system, and nothing records how many records an
Event bought. So nothing grants the Bonus Records the homepage promises, and an Owner cannot
see what they paid for. ADR 0002 said there is no capacity and no ceiling. That held only
because nothing was counted.

## Decision

Every Event has a **Record Package**: its **Paid Records** plus its **Bonus Records**. The
package caps **sending**, never planning. The guest list may grow past it, which keeps
**Free to Plan, Pay to Send** intact.

- **Over the package, a Schedule still sends, but only to records inside the package.** The
  rest are skipped, with a reason. A record that has been **Reached** (anything was sent to
  it) is always inside, and stays counted even if it is later deleted. Otherwise, deleting
  and re-adding records would make one package reach any number of guests. Any slots left
  go to the oldest unreached records, by the order they were added.
- **Paid Records come only from recorded payments.** ADR 0021's *record a payment* gains
  `records` and `channel`. Each payment adds to Paid Records, so a top-up is just another
  payment, and the payments are the audit trail. Nothing edits the total directly.
- **Bonus Records follow the homepage rule by default** (10 up to 200 paid, 20 above),
  computed from total Paid Records, so splitting a purchase never stacks bonuses. An
  Operator may override the bonus per Event. The override stays until an Operator resets
  it to automatic, and a later top-up does not undo it.
- **The channel is recorded and shown, not enforced.** See backlog 0016.
- **`comped` retires.** A free Event is a recorded payment of ₪0 with method `gift`, so
  every sending Event has a package through the same path. Existing `comped` Events move to
  `paid`. ADR 0021's meaning of `paid` ("money was received") becomes "a payment was
  recorded". Partner qualification (ADR 0020) must therefore exclude `gift` payments
  explicitly, instead of relying on the status.

## Considered Options

- **No cap, show overage only.** This fits ADR 0002 best, but with manual payment nothing
  would ever make the Owner settle the difference.
- **A hard ceiling on the guest list.** Rejected because it brings back the tier-model
  "cliff" that ADR 0002 removed, and makes planning cost money.
- **Hold the whole Schedule while over.** Rejected in favour of sending to whoever fits,
  so an invitation is never late because of a top-up. The cost: skipping must be visible
  before the send, through the Guests meter, row tags and a Featured Action.
- **Counting only live rows.** Rejected because of the delete-and-re-add loophole.

## Consequences

- Deliveries are deleted with their Guest Record, so "Reached" has to be counted somewhere
  that outlives the row.
- Rollout order: the Back Office payment entry ships first, the Operator enters packages
  for today's paid and comped Events by hand, and only then does the sending gate turn on.
  Otherwise those Events drop to a package of 0 on deploy.
- Removing an enum value in Postgres means rebuilding `event_billing_status` and the
  `can_create_schedules` generated column, plus a guard that no `comped` rows remain.
- `quote()` in the homepage `pricing.ts` returns `capacity`, which is the retired word.
  It should share the bonus rule with billing rather than keep its own copy.
