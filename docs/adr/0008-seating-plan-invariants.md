# 8. Seating Plan assignment invariants

Date: 2026-08-28

## Status

Accepted; expanded incrementally during the Seating Plan redesign.

Builds on [ADR-0005](0005-seating-plan-is-an-operational-layout.md), which settles what
the canvas is. This ADR settles how assignment behaves underneath it.

Amended by [ADR-0009](0009-a-table-is-a-seat-diagram.md), which closes the `shape` and
`rotation` question left open below and corrects the schema claim in the Consequences.

## Context

The previous seating feature mixed guest-to-Table assignment with a free-form venue
canvas. Reimplementation gives us a clean break: there is no production seating data to
preserve, but the replacement must remain coherent with Guest Records, Event Reminders,
and the scoped Seating Manager role.

ADR-0005 already decided that the visual canvas stays, and that it expresses the relative
arrangement of Tables rather than a measured venue. What it does not settle is the
assignment model beneath the canvas: who may sit where, what capacity means, and what a
Seating Manager can see. Those are the questions this ADR answers.

## Decision

### Guest Records are atomic assignments

A Guest Record may represent several people, but it does not identify them individually.
The Seating Plan assigns the entire Guest Record to exactly one Table or leaves it
unassigned; it never splits the record's amount across Tables. This makes the record's
amount its capacity contribution and keeps `guests.table_id` as the authoritative
relationship instead of introducing ambiguous per-head allocation rows.

Confirmed and pending Guest Records may be assigned. Pending assignments reserve their
full capacity but remain visibly provisional. Declined Guest Records do not participate:
declining ends the assignment immediately, and a later reconfirmation returns the record
to Unassigned rather than restoring an old Table silently.

### Table capacity is a hard invariant

A Seating Plan must never save a Table whose assigned head count exceeds its capacity.
Assignments that would exceed capacity are rejected, and capacity cannot be reduced below
current occupancy; the planner must instead move a Guest Record or deliberately increase
capacity.

This trades some drag-and-drop convenience for a plan that is always physically valid.
The invariant must be enforced at the database boundary so concurrent clients and non-UI
write paths cannot overbook a Table.

### Capacity is independent of canvas position

A Table's position on the canvas carries no capacity meaning. Two Tables drawn adjacent
are not merged, a Table dragged to the edge of the canvas is not out of play, and nothing
about a Table's coordinates relaxes or tightens its capacity check. Validation reads
occupancy and capacity only. This is what keeps the canvas an arrangement aid rather than
a second, competing source of truth.

### Table number, not position, is canonical order

Tables are canonically ordered by ascending Table number on every list surface. Canvas
coordinates are a separate, persisted property that expresses spatial arrangement; they
never reorder lists, and list order never moves a Table on the canvas.

### Seating Managers share Tables, not guest identities

A Seating Manager can view and manage every Table in the Event's Seating Plan, while
Guest Record identity and assignment access remains limited to their existing guest/group
scope. Restricting Tables themselves would fragment one capacity-constrained plan and
require a second scoping model; exposing every assigned Guest Record would defeat the
role's privacy boundary.

Table occupancy therefore includes aggregate head counts from out-of-scope assignments so
every manager sees truthful remaining capacity without seeing the names or details behind
those reserved places. Capacity validation always uses total occupancy.

A Seating Manager cannot delete a Table containing an out-of-scope Table Assignment. That
operation would mutate Guest Records they are not authorized to manage; only an Owner may
confirm it. The rejection reveals only that another collaborator manages affected
assignments, not their identities.

## Consequences

- The existing `guests.table_id` relationship remains the correct assignment model.
- The `tables` relation retains identity, Event ownership, capacity, timestamps, and the
  `position_x`/`position_y` coordinates the canvas needs under ADR-0005.
- `tables` needs a required, Event-unique positive integer `number` and an optional
  `label`. Both largely exist already: `20260516000002_add_table_number.sql` added
  `table_number` with a unique index on `(event_id, table_number)` and dropped `label`'s
  NOT NULL. What is missing is a check that the number is positive.
- Whether `shape` and `rotation` survive was left open here. ADR-0009 settles it: both
  survive as load-bearing geometry for the seat diagram - `shape` selects the seat layout,
  and `rotation` is narrowed from a free angle to a quarter turn.
- Assignment, capacity changes, RSVP transitions, and batch operations need transactional
  database enforcement rather than UI-only checks.
- Seating Manager reads need truthful aggregate occupancy without leaking out-of-scope
  Guest Record identity.
