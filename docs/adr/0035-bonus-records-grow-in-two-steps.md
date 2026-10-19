> **Partly superseded by ADR 0042:** only the opening payment earns Bonus Records. A top-up
> that crosses a step no longer earns it.

# Bonus Records grow in two steps: 10 from 200, 20 from 400

Date: 2026-10-09

## Status

Accepted. Supersedes ADR 0030.

## Context

ADR 0030 made the bonus a flat 10 from 150 Paid Records. With two Plans on the homepage
(ADR 0034), the pricing section was redesigned around what each Plan includes, and the gift
under the slider became a timeline the Owner moves along. A single step at 150 leaves most of
that line with nothing to aim for: a 160-record package and a 900-record one get the same 10.

## Decision

Bonus Records are **10 from 200 Paid Records and 20 from 400**, none below 200. The steps
replace each other, they do not add up: 400 paid earns 20, not 30.

The rule lives once, as `BONUS_STEPS` in `src/features/billing/utils/record-package.ts`.
The homepage simulator, its FAQ, the Back Office and the sending gate all read it from there.
The simulator shows both steps on one timeline, so below a step the Owner sees how many
records it is away, and past the first one they see the second.

Everything else from ADR 0024/0030 stays: the bonus is a flat number per step, never a
percentage; it is worked out from total Paid Records, so a split purchase never stacks it
and a top-up that crosses a step earns it; and an Operator may override it per Event.

## Consequences

The bonus is computed whenever a package is read, not stored (ADR 0027), so the new rule
applies to Events that already paid:

- An Event on the automatic bonus with 150 to 199 Paid Records loses its 10.
- An Event with 400 or more gains 10, from 10 to 20.
- An Event with an override is untouched.

An Operator who wants an existing Event to keep its old bonus sets it as an override, as
ADR 0030 did. When this was decided, two Events on prod were in the first group (150 paid,
automatic) and none was in the second.

The homepage's first step moves from 150 to 200, so a small package has a reason to round up
further before it earns anything, and the simulator's default of 150 records now shows the
gift as 50 records away rather than earned.
