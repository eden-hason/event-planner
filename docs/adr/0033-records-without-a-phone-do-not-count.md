# Records without a phone do not count against the Record Package

Date: 2026-10-09

## Status

Accepted. Amends ADR 0027: what "used" counts, and the order the free slots go in.

## Context

ADR 0027 counted every Guest Record in the list against the Record Package and gave the
free slots to the oldest unreached records. A record with no phone number can never be sent
to, so it never becomes Reached, and under that rule it held its slot for good. A package
of 100 with 90 guests who have a phone and 20 who don't read as "110 used, 10 over". If the
20 had been added first, the sending gate skipped 10 guests who did have a phone, while
the package still had room to reach them.

## Decision

**A Guest Record counts against the package only if it can be sent to: it was Reached, or
it has a phone number.** In that example the package has 10 slots left and nobody is
skipped.

- **Reached still always counts**, including a Reached record that later lost its phone or
  was deleted. ADR 0027's delete-and-re-add guard is unchanged.
- **The free slots go in the order records got their phone number**, not the order they
  were added. Otherwise giving an old record a phone could push out a guest who was already
  getting messages. `guests.phone_added_at` holds that moment, written only by a trigger.
- **Only going from no phone to a phone moves a record in line.** Editing the number keeps
  its place. Removing it frees the slot, and adding one back joins the back of the line.
- **A record whose number turns out to be unusable still counts** until the Owner fixes or
  removes it. The rule stays "has a phone number", which the Owner can see in the list.
- **Adding a phone when the package is full is never blocked**, which keeps Free to Plan,
  Pay to Send. The record is outside the package and tagged like any other.
- **The count says what it left out.** Wherever the package's count is shown, a quiet note
  gives the number of records without a phone that are not counted, so a count lower than
  the list explains itself.

## Considered Options

- **Keep counting every record.** Rejected: it charges a slot for a guest who can never
  receive anything, and can skip a guest who can.
- **Order by when the record was added.** Rejected: adding a phone to an old record would
  silently push a newer guest out of a full package.
- **Stop counting records whose number is proven unusable.** Rejected for now: the count
  would shift on its own after a send, and "proven unusable" needs its own definition.
