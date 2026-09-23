# Editing a Due Time has no guard for the past or for after the Event

Status: open

## The problem

The organiser edits a Schedule's Due Time (date + time) on the schedule page and saves.
Nothing checks the value against the clock or against the Event date:

- **A Due Time in the past sends immediately, with no warning.** The Dispatcher (ADR 0015)
  sends anything whose Due Time has passed, inside the Send Window and within the 48-hour
  lateness cutoff. So picking "today 10:00" at 16:00 is really "send now", but the page
  gives no hint. Afterwards the Schedule still shows 10:00, which reads as "we sent it six
  hours late".
- **A Due Time after the Event date is accepted.** An invitation or confirmation set for
  after the wedding is saved, and then either sends when it should not, or gets expired by
  the Dispatcher ("The event has already happened") with nobody told why.

## Evidence

Schedule `cc1ed60d-7ca9-40f7-9d88-31f280201e2d` (initial_invitation, Event
`f9abd3f1-45ca-4e7f-a3c4-32864f62b4a3`, Event date 2026-10-26), on 2026-09-23, Israel time:

- Seeded at -30 days, so it was due Sep 26 10:00. The Event was comped at 10:38 and the
  Schedule became active, still due Sep 26.
- The Dispatcher ran every minute and logged "Nothing due" through 16:13:19.
- The organiser was editing dates on the schedules page between 16:07 and 16:15 (server
  action POSTs at 16:12:43 and 16:13:56). The next run, 16:14:19, dispatched it with a Due
  Time of Sep 23 10:00, and it went to 99 guests.
- The organiser asked why a Schedule "set to 10:00" went out at 16:14.

## Decided

1. **Past Due Time: warn, then allow.** When the organiser saves a Due Time that is
   already past, show an alert dialog saying the message will be sent right away, with
   Confirm and Cancel. Confirming saves the value as entered. It is a warning, not a block: sending now
   is a legitimate thing to want.
2. **Due Time after the Event: prevent.** Do not let the organiser pick a date after the
   Event date. Validating on the input is the preferred form: disable those days in the
   calendar, so the invalid value can never be picked. Keep a matching check in
   `updateScheduledDate` as well, since the Server Action is callable without the UI.

## What is known

- UI: `schedule-details-card.tsx` renders the shared `DatePicker`
  (`src/components/ui/date-picker.tsx`) and a time `Select`. `DatePicker` does not take a
  disabled-days matcher today; it wraps shadcn `Calendar` (react-day-picker), which
  supports `disabled={{ after: date }}`, so the prop only needs passing through.
- Save: `schedule-settings-context.tsx` has one Save for the note and the Due Time, calling
  `updateScheduledDate` (`actions/schedules.ts`). The past-time dialog belongs at that
  Save, not on each field change, because date and time are picked separately and the
  value is only final when saved.
- The Due Time is an Israel wall clock stored as UTC (`israelWallClockToIso`), and
  `event_date` is a calendar date at 00:00 UTC. Both comparisons must be done in Israel
  time, not the browser's.

## Open questions

- **Thank You is the exception.** `post_event` is meant to go out after the Event (it is
  seeded at +1 day, and `expiryReason` in `dispatch-schedules.ts` already excepts it). The
  "not after the Event" rule must skip it, keyed on `scheduleTypeKey`, the same way.
- **Is the Event date itself allowed?** The Event Reminder is seeded at day 0, 10:00, so
  yes. The limit is "not after the Event day", compared on the Israel calendar date.
- **What does "past" mean for the dialog?** Due Time earlier than now. The dialog can't
  promise delivery "now" in every case: outside 09:00-21:00 the Dispatcher holds it until
  the window opens, and more than 48 hours in the past it expires instead of sending. The
  dialog copy (and possibly a block for "more than 48 hours ago") should reflect that
  rather than promise something the Dispatcher won't do.
- **Changing the Event date** can put existing Schedules after the Event. That is backlog
  0008's territory; this item only guards the Due Time edit itself.
- The misleading "10:00" on a sent Schedule is a separate display problem: showing when it
  actually went out needs `schedules.sent_at`, which is never set (backlog 0009).

## Done means

Saving a past Due Time shows a confirmation that it sends immediately, and saves only on
Confirm. Days after the Event date cannot be picked for any Schedule except Thank You, and
`updateScheduledDate` rejects such a value on the server too. Both use Israel time.
