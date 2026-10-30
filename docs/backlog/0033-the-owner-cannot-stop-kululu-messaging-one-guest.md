# The Owner cannot stop Kululu messaging one guest

Status: open

## The problem

Some guests the Owner wants to handle themselves: a grandmother they will call, a rabbi, a
VIP who should not get a bot's message. Today there is no way to keep one Guest Record out
of Kululu's messages and still keep it on the list. The only ways out of an audience are
deleting the record, which loses its seat and its count, or typing an RSVP, which says
something false about whether they are coming.

This came up while designing the guest drawer's Communication tab (ADR 0050). That tab
shows every Outreach Item for one Guest, so it is the natural place for the switch. It was
deferred because it changes the domain, not just the view.

## What is known

- Every Schedule's audience is the `target_status` predicate over the guest list,
  resolved at dispatch (`filterGuestsByTarget`). A mute would be one more condition in
  that predicate, and the same condition in the Catch-up Send eligibility and in the Back
  Office late-guest rules (`features/admin/utils/late-guests.ts`).
- Call Rounds pick their Guests separately, in the Back Office. A muted Guest needs a
  decision there too: is a call still allowed when a message is not?

## Still unknown

- **Does a muted Guest Record count against the Record Package?** It has a phone, so under
  ADR 0033 it counts, but Kululu will never send to it. Not counting it makes mute a way
  to fit a bigger list into a smaller package.
- **What do the results show?** A muted Guest is not in the audience, so they are not "Not
  sent" either. The results need to say plainly that the Owner excluded them, or the
  numbers will not add up to the guest list.
- **Per Guest, or per Guest and Schedule?** "No reminders for Grandma, but she gets the
  invitation" is a real case, but it gives every Guest a matrix of switches.
- Whether Owners actually want this. Measure how often a Guest is deleted, or given a
  typed RSVP, before their first Delivery.

## Done means

An Owner can mark one Guest Record as handled by them. No Schedule reaches it, the
Communication tab and the results say why, and the Record Package rule for it is written
down.
