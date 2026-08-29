# 9. A Table is a seat diagram, not a floor position

Date: 2026-08-29

## Status

Accepted

Amends [ADR-0008](0008-seating-plan-invariants.md). Builds on
[ADR-0005](0005-seating-plan-is-an-operational-layout.md), which stands unchanged.

## Context

ADR-0005 settled that the Seating Plan keeps a visual canvas expressing the relative
arrangement of Tables. ADR-0008 settled how assignment behaves underneath it, and
deliberately left one question open: whether `shape` and `rotation` survive as Table
properties, "reviewed on their own merits rather than removed as canvas-only fields".

The approved Seating Plan design answers that question, and in answering it changes what a
Table *is* on screen. In the design a Table is not a labelled box that happens to sit
somewhere. It is a top-down diagram of a physical table with one seat drawn per unit of
capacity, and those seats fill in as Guest Records are assigned: confirmed places first,
then provisional places, then empty. A planner reads occupancy off the picture before
reading any number.

That reframing has consequences the two existing ADRs do not record, and it surfaces two
places where ADR-0008's Consequences no longer describe the schema accurately.

## Decision

### Capacity is drawn, so shape and rotation are load-bearing

`shape` survives, promoted from decoration to geometry. It selects how the seats are laid
out: a ring for `round`, a walk around the perimeter for `square` and `rectangle`. Changing
a Table's shape changes how its capacity is drawn and nothing else - not the capacity
itself, not its validity, not its position.

`rotation` survives too, but only as a quarter turn: 0, 90, 180, or 270 degrees. The
design draws no rotated Table, and the old free-angle column was never rendered by any
code - but a long table laid across a room is the ordinary case a planner arranges, and a
canvas that cannot express it forces the wrong picture.

Quarter turns, not an arbitrary angle, because a Table's footprint has to stay computable.
The canvas places new Tables without overlapping them and frames the plan on fit, and both
read the diagram's own box. A quarter turn swaps that box's two dimensions; any other angle
makes the footprint something the drawing no longer describes, and the placement maths would
need a second, separate model of the same Table. That is exactly what made the old column
decorative.

Rotation stays an arrangement property in the sense ADR-0005 and ADR-0008 require: it
changes where a Table's seats are drawn and nothing else - not capacity, not validity, not
list order.

The control is offered on long tables only, and as a two-state orientation rather than a
turn: a round or square footprint is symmetric, so a quarter turn there changes nothing a
planner can see, and 180 and 270 redraw the same two pictures as 0 and 90. The column keeps
all four values - it costs nothing and the constraint is about what the footprint maths can
express - but the UI never needs to reach them. It is also a canvas affordance, so the
control appears on desktop only.

### Completeness counts records; the numbers a planner reads count guests

Two questions are asked of the plan, and they are answered in different units.

*Is it done?* is a count of Guest Records: the plan is complete when every confirmed Guest
Record has a Table Assignment, and the headline readiness percentage is seated confirmed
records over confirmed records. Measuring completeness in heads would let one large family
swing the number more than a dozen couples, and would report a plan as unfinished purely
because a six-person record is still being placed.

*How many people are involved?* is a count of heads. Capacity is a count of people - every
occupancy figure, every fit check, and every rejection sums each record's `amount` - and so
are the supporting lines on the progress bar: "8 confirmed guests still need a seat", "470
pending guests unseated". A planner seats people, not rows, so the count they act on is
stated in people. The two live side by side on the same widget: the percentage above is
records, the guest counts below it are heads, and neither is folded into the other.

Confirmed and provisional figures are likewise presented separately and validated as a
combined total, per ADR-0008.

### Capacity is bounded at 2 to 24, and new Tables default to 10

A Table below two seats is not a table, and above twenty-four the seat diagram stops being
readable, which is the whole point of drawing it. Creation prefills 10 in both the single
and batch flows and keeps it visible and editable; it is never inferred from previously
created Tables.

### The canvas is a desktop affordance over a plan that does not need it

The canvas is where a planner arranges Tables relative to one another, and it is a desktop
surface. Mobile reaches every operation - create, assign, unassign, edit, delete - through
Tables and Unassigned tab lists, and draws no canvas.

Neither surface is authoritative. They read and write the same Tables and the same
assignments, and a plan built entirely on mobile is as complete and as valid as one built
on the canvas. This follows directly from ADR-0008: position carries no capacity meaning,
so a surface that omits position omits nothing that matters to correctness.

### Aggregate occupancy is a distinct read, not a filtered one

ADR-0008 requires a Seating Manager to see truthful remaining capacity including
out-of-scope assignments, without seeing the identities behind them. Row Level Security
hides those Guest Records from any ordinary read, so the truthful total cannot be derived
from what the collaborator can select.

Occupancy is therefore its own privileged aggregate, returning per Table the confirmed and
provisional head counts, the total record count, and the record count the caller may
actually see. The difference between the last two is what the interface renders as an
anonymized "N records outside your scope" row. Names never cross that boundary.

## Consequences

- `tables.shape` stays, and its enum values keep their current spelling (`round`,
  `rectangle`, `square`). `tables.rotation` stays as well, narrowed from a free angle to
  `smallint` with `CHECK (rotation IN (0, 90, 180, 270))` and a default of 0.
- The canvas's footprint helper takes rotation and swaps width for height on a quarter
  turn, so placement, fit-to-view, and the drawn box cannot disagree.
- Rotation is applied inside the SVG, not as a CSS transform on the element: a CSS rotate
  leaves the layout box unrotated, which would leave a quarter-turned long table reserving
  its original width and sitting crooked under its own label.
- A dragged Table snaps its `position_x`/`position_y` to a 24-unit world grid
  (`utils/snap.ts`), applied live as a dnd-kit modifier and re-applied on drop, with a
  faint dot grid on the canvas to make the lattice visible. This stays inside ADR-0005: the
  grid has no real-world unit, adds no boundary, and does not stop two Tables overlapping -
  it only spares the planner pixel-nudging a row into line. The grid is quantized in world
  units, not screen pixels, so it holds still under zoom, and auto-placed Tables land on
  the same grid.
- `tables.capacity` moves from `CHECK (capacity > 0 AND capacity <= 100)` to a 2-24 range,
  and its default from 8 to 10.
- ADR-0008's Consequences bullet claiming `tables` still needs an Event-unique positive
  integer number and an optional `label` is stale: `20260516000002_add_table_number.sql`
  added `table_number` with a unique index on `(event_id, table_number)` and dropped
  `label`'s NOT NULL. What was genuinely missing is a positivity check on the number.
- The column keeps the name `table_number`; ADR-0008's `number` names the concept.
- Occupancy needs a `security definer` aggregate over an Event's Tables, guarded by existing
  Event access, rather than a query the caller composes.
- Every occupancy figure the interface shows, and every capacity rejection it explains, is
  denominated in people; every completion figure is denominated in records.
