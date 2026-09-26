# Invited and coming are edited apart, and an Owner's count is an override

ADR 0023 split a Guest Record's count into `invited_amount`, what the Owner invited, and
`amount`, how many are coming. The Owner still edited it through one field, so an Owner
changing the count was treated as a new invitation: `invited_amount` moved with it, and any
flag on the Guest's answer was cleared. The redesigned guest drawer shows the two as separate
fields, "invited" and "coming", and the list now flags a count the Guest changed, whether
fewer or more. With both on screen, one field that moves both would silently rewrite
whichever the Owner did not touch.

So the drawer edits them apart. `upsertGuest` takes an explicit `invitedAmount` and, when it is
sent, writes it as given instead of moving it with `amount`. A record that is not confirmed has
no answer of its own, so it is saved at its invitation. Callers that send only `amount` keep
ADR 0023's behaviour of treating it as a new invitation: the mobile card, the AI chat and the
importers.

Once a record is confirmed, the coming count is the Guest's answer. An Owner who changes it is
overriding the Guest, not correcting a typo on their behalf. The save is recorded as the Owner's,
the same way a status change is: `rsvp_change_source = 'manual'`, with who and when
(`isOwnerOverride`). The list shows a count as the Guest's change, with the blue chip and the
"+N" above-invited badge, only while the source is the Guest's: `guest`, or `admin_call`,
since a call relays the Guest's own answer. Saving the drawer untouched, or re-inviting a
pending record, attributes nothing.

**Considered Options:** a silent correction was rejected. It keeps the Guest as the author of a
number they never gave, so the list would go on calling it their change. A separate "amount
changed by" column was rejected for the same reason ADR 0007 rejected `rsvp_changed_by`: it
answers "who" for one field and only for the latest change. The existing provenance already
answers it for the RSVP as a whole, and the count is part of the RSVP.

**Consequences:** an Owner who confirms a count on the Guest's behalf takes over the whole RSVP's
provenance. The Activity timeline shows the change as theirs, and the Guest's own answer survives
only there. The Back Office's guest editing (ADR 0007) is not built yet. When it
is, an Operator changing a confirmed count should follow the same rule, attributed as
`admin_edit` rather than `manual`.
