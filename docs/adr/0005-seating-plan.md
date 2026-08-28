# Seating Plan architecture and invariants

## Status

Accepted; expanded incrementally during the Seating Plan redesign.

## Context

The previous seating feature mixed guest-to-Table assignment with a free-form venue canvas. Reimplementation gives us a clean break: there is no production seating data to preserve, but the replacement must remain coherent with Guest Records, Event Reminders, and the scoped Seating Manager role.

## Decision

### A Seating Plan is not a floor plan

The replacement is a responsive table-and-guest assignment workspace, not a spatial venue editor. Completing and validating assignments is the product's core job; spatial editing adds substantial interaction and data-model complexity without serving that job. Table shape, position, and rotation therefore do not belong in the replacement unless a later requirement independently justifies them.

### Guest Records are atomic assignments

A Guest Record may represent several people, but it does not identify them individually. The Seating Plan assigns the entire Guest Record to exactly one Table or leaves it unassigned; it never splits the record's amount across Tables. This makes the record's amount its capacity contribution and keeps `guests.table_id` as the authoritative relationship instead of introducing ambiguous per-head allocation rows.

Confirmed and pending Guest Records may be assigned. Pending assignments reserve their full capacity but remain visibly provisional. Declined Guest Records do not participate: declining ends the assignment immediately, and a later reconfirmation returns the record to Unassigned rather than restoring an old Table silently.

### Table capacity is a hard invariant

A Seating Plan must never save a Table whose assigned head count exceeds its capacity. Assignments that would exceed capacity are rejected, and capacity cannot be reduced below current occupancy; the planner must instead move a Guest Record or deliberately increase capacity.

This trades some drag-and-drop convenience for a plan that is always physically valid. The invariant must be enforced at the database boundary so concurrent clients and non-UI write paths cannot overbook a Table.

### Seating Managers share Tables, not guest identities

A Seating Manager can view and manage every Table in the Event's Seating Plan, while Guest Record identity and assignment access remains limited to their existing guest/group scope. Restricting Tables themselves would fragment one capacity-constrained plan and require a second scoping model; exposing every assigned Guest Record would defeat the role's privacy boundary.

Table occupancy therefore includes aggregate head counts from out-of-scope assignments so every manager sees truthful remaining capacity without seeing the names or details behind those reserved places. Capacity validation always uses total occupancy.

A Seating Manager cannot delete a Table containing an out-of-scope Table Assignment. That operation would mutate Guest Records they are not authorized to manage; only an Owner may confirm it. The rejection reveals only that another collaborator manages affected assignments, not their identities.

## Consequences

- The existing `guests.table_id` relationship remains the correct assignment model.
- The `tables` relation retains identity, Event ownership, number, optional label, capacity, and timestamps; canvas-only fields can be removed.
- Assignment, capacity changes, RSVP transitions, and batch operations need transactional database enforcement rather than UI-only checks.
- Seating Manager reads need truthful aggregate occupancy without leaking out-of-scope Guest Record identity.
