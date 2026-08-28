# Seating reimplementation - Claude Design brief

Status: In discovery; decisions are locked incrementally through the accompanying grilling session.

## Product premise

Design a responsive Seating Plan workspace for Kululu, an event-planning product whose primary users are couples organizing weddings. The page's single job is to help a planner organize invited people among Tables and confidently determine whether the plan is complete and valid.

The workspace is an operational layout, not a venue blueprint. Tables carry a relative
arrangement the planner can see and adjust, but the page models no measured venue: no
scale, room boundaries, fixtures, or collision handling. See ADR-0005.

## Locked decisions

- The canonical domain term is **Seating Plan**.
- The page must focus on Tables and assignments rather than measured venue geometry.
- A visual canvas showing Tables' relative arrangement is a launch requirement, not a later phase.
- Canvas position is an arrangement aid only; it never affects capacity, validity, or completion.
- The replacement must work on both desktop and mobile; it must not preserve the former desktop-only boundary.
- A Guest Record is assigned atomically: every person represented by that record sits at the same Table.
- Splitting a Guest Record across Tables is not supported.
- Confirmed and pending Guest Records can be assigned in the active Seating Plan.
- Pending assignments are provisional and must be visibly distinguishable from confirmed assignments.
- Declined Guest Records do not participate in the active Seating Plan or consume its capacity.
- Changing a seated Guest Record to declined immediately removes its Table Assignment and releases its capacity.
- Reconfirming a previously declined Guest Record returns it to the unassigned list; an old assignment is never silently restored.
- Table capacity is a hard invariant. Reject any assignment that would exceed it.
- Pending Table Assignments reserve their full Guest count against capacity, exactly like confirmed assignments.
- Show confirmed and provisional occupancy separately while validating their combined total against capacity.
- Do not allow capacity to be reduced below the Table's current occupancy.
- Capacity failures must explain the requested party size, remaining places, and the next corrective action; never fail silently.
- Every Table has a required positive integer number that is unique within its Event.
- A Table may also have an optional descriptive label; render both as “Table 12 · Family” when present.
- Planners can edit a Table number, but duplicate numbers must be rejected.
- Arbitrary labels do not replace the guest-facing Table number.
- New Tables default to the next integer after the Event's current highest Table number.
- Never renumber existing Tables or reuse a numbering gap automatically.
- A planner may deliberately fill a gap by editing a Table number, subject to uniqueness.
- Tables are canonically ordered by ascending Table number on every list surface.
- Do not add persistent custom list ordering or drag-to-reorder behavior in lists.
- Canvas position is persisted separately and never changes list order, and list order never moves a Table on the canvas.
- Support both batch creation for initial setup and single-Table creation for later adjustments.
- Batch creation captures quantity, starting number, and capacity; preview the resulting number range before confirmation.
- Batch creation is atomic: if any requested Table number conflicts or any value is invalid, create none of the batch.
- Prefill Table capacity with 10 in both creation flows; keep it explicitly visible and editable.
- Do not infer creation capacity from previously created Tables.
- The universal assignment interaction is an explicit “Assign to Table” picker available on desktop, mobile, touch, and keyboard.
- Desktop additionally supports drag-and-drop as a speed enhancement, never as the only assignment path.
- Picker and drag-and-drop must call the same assignment operation and capacity validation.
- Preserve the Guest Directory's Table field as an assign/unassign picker for existing Tables.
- Remove inline Table creation from the Guest Directory. All Table creation belongs to the Seating Plan's explicit single/batch flows.
- The Guest Directory picker shows number, optional label, confirmed/provisional occupancy, capacity, and whether the current Guest Record fits.
- Disable ineligible destinations with a precise capacity explanation rather than allowing a request that must fail.
- A declined Guest Record has no editable Table Assignment; changing RSVP to declined clears the field as part of the same save.
- The Seating Plan is Table-centric; the Guest Directory remains the guest-centric management surface.
- Desktop uses a searchable Unassigned panel alongside Tables ordered by number.
- Mobile uses top-level Tables and Unassigned tabs with live counts.
- Each Table summary shows its number, optional label, confirmed occupancy, provisional occupancy, remaining capacity, and assigned Guest Records.
- Guest search spans both assigned and unassigned records and reveals the matching record in context.
- Unassigned supports multi-select with live selected Guest Record and represented Guest counts.
- “Assign selected” is atomic: every selected record moves only if their combined head count fits the destination Table; otherwise none move.
- Capacity failure copy states the selected head count, available places, and shortfall.
- The Seating Plan is complete when every confirmed Guest Record has a Table Assignment.
- Pending unassigned records remain a visible provisional warning and progress count but do not block completion.
- Present confirmed readiness and pending coverage separately; never collapse them into one misleading percentage.
- Seating Managers can view and manage every Table in the Event.
- Seating Managers can identify and assign only Guest Records within their existing guest/group scope.
- Table occupancy and remaining capacity must include out-of-scope assignments as anonymized head counts; never expose their names or details.
- Capacity validation always uses total occupancy, not merely the Guest Records visible to the current collaborator.
- Block a Seating Manager from deleting any Table containing an out-of-scope assignment; do not reveal affected identities.
- An Owner may delete that Table through the normal impact-specific confirmation.
- An occupied Table may be deleted only after an explicit destructive confirmation naming the Table and showing both the affected Guest Record count and represented Guest count.
- Deleting a Table returns all of its Guest Records to Unassigned; it never deletes Guest Records.

## Decisions still in discovery

- Core assignment interactions on desktop and mobile.
- Completion and warning behavior.
- Bulk operations, automation, import/export, and print/share requirements.
- Visual direction, responsive information architecture, states, and motion.
- How the canvas behaves on mobile, and how it relates to the list surfaces.
- Whether Table shape and rotation are retained as canvas properties.

## Implementation constraints

- Reuse Kululu's existing design system and shadcn/ui primitives where appropriate.
- Use semantic design tokens and the project's icon system.
- Produce deliberate RTL-first behavior for Hebrew and equally complete LTR behavior for English.
- Treat keyboard access, touch targets, reduced motion, loading, empty, error, and optimistic-update recovery as first-class states.

## Explicitly out of scope

- Backward compatibility for old seating data; there is no production seating data.
- Preserving canvas-era implementation or schema solely to avoid a clean break; the canvas
  is retained on its own merits under ADR-0005, not for continuity.
- Measured venue geometry: scale, room boundaries, fixtures, and collision modeling.
- Automatic, algorithmic, or AI-generated seating suggestions.
- Disabled “smart seating” controls or coming-soon affordances. The implemented workflow is intentionally manual.
- Creating Tables implicitly from the Guest Directory's Table field.
