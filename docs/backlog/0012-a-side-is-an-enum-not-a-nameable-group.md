# A Side is a fixed enum, so it cannot be renamed from the event details page

Status: open

## The problem

The Event Details redesign (Claude Design, turn 1, frame `1g`) asks for a third field beside
each host's name and parents: **שם הצד** - an editable side name, with the note

> שינוי שם צד מעדכן את הקבוצה ואת 34 האורחים שמשויכים אליה

and a section subtitle claiming *הצדדים הם גם שמות הקבוצות ברשימת האורחים* - the sides are the
group names in the guest list.

Neither claim is true of the current model, so the field shipped read-only and the note was
replaced with one that is true (`eventDetails.hosts.sideNote`).

## What is known

- A **Side** is `groups.side`, a two-value enum: `'bride' | 'groom'`, nullable. `guests.side`
  carries the same enum per Guest Record. It is not a name and there is no column to put one in.
- Its labels are fixed copy, not data: `guests.sides.bride` / `.groom` ("צד הכלה" / "צד החתן")
  in both catalogs, plus `GROUP_SIDE_LABELS` in `src/features/guests/schemas/index.ts`.
- A Side is **one-to-many** over Groups. "צד הכלה" is not a group; it is a bucket that any
  number of named Groups (חברים מהצבא, משפחה מצד אמא) sit in. There is no single group whose
  name the drawer could be editing, and "the 34 guests assigned to it" describes a Group, not
  a Side.
- The enum is read in at least seven places that would all have to change with it:
  `filters/side-filter.tsx`, `mobile/guest-filters-sheet.tsx`, `table/columns.tsx`,
  `guest-form.tsx`, the CSV import mapper and its row editor
  (`compute-import-rows.ts`, `mobile-row-edit-sheet.tsx`), `home/group-breakdown-card.tsx`,
  and the AI chat's confirm step (`aiChat.confirm.sideValues.*`).
- `host_details.{bride,groom}.parents` is free text and is *labelled* "צד הכלה" / "צד החתן"
  in the old page - which is where the design's confusion comes from. The redesign relabels it
  "שמות ההורים", which is what it has always held.

## Options considered

- **Store a per-Event side label** (`host_details.bride.sideLabel`, or two columns on
  `events`). Smallest change that makes the field editable. But it creates a second source of
  truth for a label that eight other surfaces read from `messages/*.json`, and none of them
  would pick it up without also being taught to.
- **Make a Side a row** (`event_sides` table: id, event_id, name, ordinal) and point
  `groups.side_id`/`guests.side_id` at it. The only version that honours the design's note,
  and the only one that would let a non-couple event have sides that are not "bride" and
  "groom" (see backlog 0003, a general event type). A migration, a backfill, and a rewrite of
  every filter and import path above.
- **Rename the Group instead.** Rejected as a misreading: the drawer is about the two people
  the Event is named after, and the guest list already has its own group editor with a name
  field.

## Still unknown

- Whether an Owner actually wants to rename a Side, or whether the design's field was an
  attempt to give the parents' text a clearer home - which relabelling already did. Worth
  asking before building anything.
- Whether a mitzva should have sides at all. `groups.side` offers `bride`/`groom` to a bar
  mitzva today, which is already wrong, and the redesign's drawer shows no side for that type.

## Done means

Either the side label is editable and every surface that shows a Side reads the same name, or
the product has decided Sides stay fixed and the design brief says so.
