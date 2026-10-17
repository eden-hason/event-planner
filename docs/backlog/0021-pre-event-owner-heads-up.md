# The Owner hears nothing from Kululu in the days before the Event

Status: open
Area: owner messages / outreach
Related: `docs/adr/0039-owner-messages-are-not-schedules.md`, CONTEXT.md (Owner Message, Event Reminder)

## The problem

The days before the Event are when an Owner worries most about who is coming. Kululu
knows the answer (RSVP counts, who has not answered, when the Event Reminder goes out),
but the Owner has to open the app to find it. ADR 0039 shipped only two **Owner
Messages**, a welcome and a post-event note. This would be a third, sent before the Event.

## The idea

The day before the Event, send the Owner a WhatsApp along the lines of: "X confirmed, Y
still haven't answered, the reminder goes to your guests tomorrow at 10:00", with a button
to the results or seating page.

## What is known about the moving parts

- The welcome and post-event rules in ADR 0039 (creator only, WhatsApp only, Hebrew, 48h
  expiry, Operator "send now") would apply as they are.
- The numbers would come from the same RSVP and Delivery data the Schedule Results tab
  reads.
- The Event Reminder's Due Time can be undated or changed (ADR 0029, ADR 0022), so "goes
  out tomorrow at 10:00" must be read when the message is sent, not when it is planned.
- Meta template variables are fixed text, so a count of 0 or a missing Event Reminder
  needs its own wording or its own template.

## Open questions

1. When exactly? The day before at a fixed hour, or relative to the Event Reminder's Due
   Time?
2. Does it skip Saturday the way the post-event message does? For a Saturday-night Event
   the day before is Friday, which is fine, but for a Sunday Event it would be Saturday.
3. What if the Event has no Event Reminder planned, or nothing was ever sent? Skip it, or
   send a "you haven't sent anything yet" version?
4. Utility or marketing? Status numbers about the Owner's own Event should be utility.

## Done means

The Owner gets one heads-up per Event before it, with live numbers, and the decision is
recorded as an amendment to ADR 0039.
