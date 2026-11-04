# A co-owner sees less than the Event's creator, and the gap breaks package reads

Status: open

## Problem

Every Owner is supposed to see the same Event. `CONTEXT.md` says "Every Owner has full
access to everything on the Event", and ADR 0041's Consequences say a co-planner who joins
by link "gets full Owner access, including guest phone numbers, the budget and payment".

The code and the database draw a line the docs do not: **payments are creator-only**. An
Owner who joined through the Co-planner Link is in `event_collaborators` with role `owner`,
but is not `events.user_id`, and:

- `event_billing_events_select` (RLS, `20260909000000_event_billing_status.sql`) admits only
  `events.user_id = auth.uid()` or an admin. It is the only Event-scoped planning table
  whose select policy does not admit collaborators (checked against production on
  2026-11-04; `owner_messages` and `whatsapp_import_sessions` are also per-person, by
  design).
- `canSeePayments` (`src/components/feature-layout/collaboration-context.tsx`) is
  `isCreator`, and hides from a co-owner: the Package entry in the sidebar and the More
  page, the "details" link on the package card, the Top-up plan, and every plans link
  (`usePlansHref`).
- `getRecordPackagePageView` redirects anyone but the creator away from `/app/[eventId]/package`.

No ADR records this line. It reads as a choice made in code ("it carries money") that
was never weighed against ADR 0041.

## How it broke

RLS hides rows rather than raising, so a co-owner reading payments gets **zero rows and no
error**. `loadRecordPackage` (`src/features/billing/services/load-record-package.ts`)
then sees no payments, returns `package: null`, and `splitByPackage` with size 0 puts every
record that was not Reached outside the package. The "unknown standing is outside" safety
net in callers never fires, because nothing looks unknown.

Seen on Event `59895f32-6da4-442e-9a7b-e3e2f8f43d9c` (2026-11-04): 500 paid + 20 bonus =
520 records, 452 Guest Records, 228 Reached, two Owners. The co-owner's guest drawer showed
a guest added after the Invitation as "outside the package - need to add records to send",
with no Catch-up Send. The creator, and an Operator impersonating, saw the button.

PR #594 fixed that one caller: the drawer now loads the package with the service client
after the guest read through RLS has proved access, the same way `getGuestPackageView`
already did for the Guests page's package line. That is a per-caller workaround. Any new
code that calls `loadRecordPackage` or `loadOutsidePackageIds` with the viewer's client
gets the same silent wrong answer. `getRecordPackage` in
`src/features/billing/queries/record-package.ts` does exactly that and is still exported,
though nothing calls it today.

Already safe, because they run on the service client: the Catch-up Send action
(`sendCatchUp`), `startCallRound`, the Dispatcher and the renderer.

## Options

### A. Parity: a co-owner sees what the creator sees (recommended)

Bring the code in line with ADR 0041 and `CONTEXT.md`.

- Migration: widen `event_billing_events_select` to `... or public.user_has_event_access(event_id)`.
- Drop `canSeePayments` (or make it true for every Owner): the sidebar and More entries,
  the package card link, the Top-up plan, `usePlansHref`.
- `getRecordPackagePageView`: allow any Owner, not only `isCreator`.
- Remove the service-client workarounds in `getGuestPackageView` and
  `getGuestCommunicationInput` (PR #594); they become plain RLS reads.

This removes the whole class of bug: `loadRecordPackage` gives the same answer with any
Owner's client.

### B. Keep money creator-only, but make the package readable by every Owner

If creator-only payments is a real decision, write it as an ADR, then:

- Add a `security definer` function, gated on `user_has_event_access(event_id)`, that returns
  only what the package needs from each payment: `record_count`, `channel`,
  `payment_method`, in `occurred_at desc, created_at desc` order. Never amounts, references
  or notes. RLS cannot hide columns, so it has to be a function (or a view with its own
  grant), not a policy change.
- Have `loadRecordPackage` read payments through it, so it is correct with any client.
- Remove the service-client workarounds and `getRecordPackage`, as in A.

The package page, Top-up and plans links stay creator-only.

## Checked and ruled out

- **Treating zero payments as "unknown" in `loadRecordPackage`.** A free or unpaid Event
  really does have zero payments; the function cannot tell a hidden row from a missing one.
- **Fixing it per caller with the service client** (what PR #594 did). It works, but every
  future caller has to know about it, and forgetting fails silently.

## Open questions

- Is there a reason, never written down, for keeping money from co-owners? For example,
  one partner paying privately. If so, that is option B, and it needs an ADR.
- Under A, may a co-owner top up? Who is the payer on the receipt, and does a Partner
  Commission or Owner Message (ADR 0039, creator-only) care who paid?
- Under A, should a co-owner see a payment's `reference` and `note`? The page already strips
  them for the creator.
- Backlog 0026: the Co-planner Link cannot be shut off. Option A means anyone holding it
  sees payment amounts too. ADR 0041 already accepted that, but it raises the stakes of
  0026.

## Done means

- A co-owner's client returns the same `loadRecordPackage` result as the creator's for the
  same Event, with a local `db reset` check that proves it (both options).
- No owner-facing package read goes through the service client just to get past
  `event_billing_events` RLS.
- The decision is written as an ADR: A amends ADR 0041's Consequences, B records the
  creator-only exception and updates `CONTEXT.md`'s Owner entry.
