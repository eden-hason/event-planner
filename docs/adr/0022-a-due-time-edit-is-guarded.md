# A Due Time edit is guarded against the past and against after the Event

Editing a Schedule's Due Time checked nothing. A time already past was sent by the next
Dispatcher run with no warning (backlog 0014: "today 10:00" picked at 16:00 went to 99 guests
at 16:14), and a time after the Event was saved and then either sent or quietly expired.

Both are now guarded, with one rule in `utils/due-time-guards.ts` shared by the page and
`updateScheduledDate`, read in Israel time like the Dispatcher:

- **After the Event: prevented.** Days after the Event day cannot be picked in the calendar,
  and the Server Action rejects them. The Event day itself is allowed (the Event Reminder is
  seeded on it) and the Thank You is excepted, the same way `expiryReason` excepts it.
- **Past, but still sendable: confirmed.** Save opens a dialog that says what the Dispatcher
  will really do - send right away, or, outside the Send Window, send when it next opens,
  naming that moment - and who it goes to. Only Confirm saves.
- **Past the lateness limit: prevented.** A Due Time the Dispatcher would expire instead of
  send is refused on the page and in the Server Action. Days entirely beyond the limit are
  not offered in the calendar; a time on a partly-past day shows an inline error and holds
  Save.

**Considered Options:** confirming on each field change was rejected because date and time
are picked separately, so the Due Time is only final at Save. Letting an organiser confirm an
expiring Due Time was rejected because an expired Schedule can no longer be edited, so the
confirmation would silently throw the Schedule away. Disabling every past day was rejected
because sending now is a legitimate thing to want.

**Consequences:** only an edited Due Time is judged. One that was already after the Event
because the Event date moved stays as it is until the organiser touches it (backlog 0008).
