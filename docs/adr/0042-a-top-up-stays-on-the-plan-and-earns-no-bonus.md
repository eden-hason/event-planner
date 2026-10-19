# A Top-up stays on the Plan and earns no bonus

Date: 2026-10-19

## Status

Accepted. Partly supersedes ADR 0035 (a top-up that crosses a step no longer earns it) and
ADR 0027 (the bonus is no longer worked out from total Paid Records). Answers the first
open question of backlog 0016.

## Context

ADR 0027 made a top-up "just another payment", but only an Operator could record one, and
the Owner's way in was a WhatsApp link that said nothing about how many records, on which
Plan, or what it would cost. Two things a top-up could mean were never decided: what Plan
it is bought on (backlog 0016 asks what 150 on WhatsApp then 50 on WhatsApp + calls means),
and whether it can earn Bonus Records. Under ADR 0035 it could: a package of 190 topped up
by 20 crossed 200 and gained 10 free records.

## Decision

A **Top-up** is any payment after the one that opened the package.

- **It is bought on the package's own Plan, at that Plan's rate** (1.5 ₪ or 2 ₪, ADR 0034).
  The Plan is a property of the package, not of each payment. The Owner's top-up sheet
  shows the Plan without offering another, and recording a payment on a different Plan
  for an Event that already has a package is refused. A package on SMS, which is no longer
  sold, may move to a Plan that is.
- **It earns no Bonus Records.** The automatic bonus is worked out from the opening payment
  alone (`automaticBonus` in `src/features/billing/utils/record-package.ts`), so it is
  settled the day the package opens. An Operator override still wins, as before.
- **It is sold in steps of 10, from 10, with no ceiling** (`src/features/billing/utils/top-up.ts`).
  The steps are the Owner's picker only: an Operator recording a payment may still enter
  any whole number, for corrections and odd gifts.
- **It is offered only while the package can grow:** the Event is `paid`, the package is
  not a gift from Kululu, its Plan is on sale, and the Event day has not ended. Anywhere
  else the "add records" action is not shown at all.
- **Checkout is still a WhatsApp conversation**, pre-filled with the records, Plan and
  price, as the first purchase is. An Operator records it in the Back Office as today.
- **The payments list marks it.** Every payment after the first carries a "תוספת" chip, as
  the first carries "רכישה ראשונה".

## Considered Options

- **Let a top-up pick either Plan.** Rejected: a package with records on two Plans has no
  single answer to what it includes, and the plan badge shows the latest payment's Plan,
  so a 50-record top-up on WhatsApp + calls would relabel a 300-record WhatsApp package.
  Upgrading a package's Plan stays open in backlog 0016.
- **Keep the bonus on total Paid Records.** Rejected: the bonus is a reason to round the
  first purchase up, and a top-up quote that keeps changing the free records is harder to
  read than one that is records × rate.

## Consequences

- No Event changed package on the day this was decided: none on prod had more than one
  payment, so no bonus moved.
- An Owner who opens with 190 and tops up by 20 has 210 paid and no bonus, where ADR 0035
  gave them 10. The homepage FAQ only promises more records "באותו מחיר לרשומה", which
  still holds.
- `recordPackage()` now reads payments oldest first, since the first one sets the bonus.
  Every caller reads them newest first and reverses them.
