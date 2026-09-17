# A Due Time is a request, not an instruction

A Schedule held two answers to "when": `scheduled_date`, a real instant, and
`scheduled_time`, a timezone-naive clock face. Three places wrote them and only one did it
correctly - `updateScheduledDate` wrote the two columns independently, and
`calculateScheduledDate` applied the catalog's "10:00" with `setHours`, which on Vercel
means 10:00 UTC and so 13:00 in Israel. The two columns disagreed on 55% of rows. None of
it mattered while a single daily cron sent everything at 10:05 Israel regardless, which is
exactly why it went unnoticed: a Schedule was never really *due*, only overdue.

We collapsed the two into one. `scheduled_date` is the Schedule's **Due Time** - a single
instant, authored as Israel wall clock through `israelWallClockToIso` (which handles DST
and which `call-plans.ts` already used), stored as UTC. `scheduled_time` is dropped.

Making the Dispatcher honour that instant is what forced the rest. A per-minute Dispatcher
sends at the authored time for the first time ever, so the accidental business-hours
guarantee disappears and Kululu can message a wedding guest at 3am. We therefore made the
Due Time a *request*: the Dispatcher holds anything outside the **Send Window** (09:00 to
21:00 Israel, and never Friday afternoon through Saturday evening) until the window opens,
and **expires** anything whose Event has already happened - Thank You excepted - or whose
Due Time is more than 48 hours past. The window is evaluated at dispatch, not at authoring,
because the case it exists for is Kululu being down all evening and coming back at midnight
to a queue of Schedules that all came due while it was away.

**Considered Options:** keeping both columns and making the naive one authoritative was
rejected - two columns that can disagree will, and the disagreement decides whether a phone
buzzes at 10pm. A per-Schedule-Type lateness tolerance was rejected as a knob nobody has
asked for; the Event-date rule already catches the only genuinely harmful case, an Event
Reminder telling 200 people where to sit at a wedding that ended last night.

**Consequences:** the 48-hour cutoff is deliberately larger than the longest possible hold.
The Shabbat guard can hold a Schedule about 29 hours, and a 24-hour cutoff would expire
Schedules the guard itself held - the two settings have to be read together, and changing
either means rechecking the other. Because holding happens *before* the audience is
expanded, a held Schedule's audience is computed when it finally sends, so an RSVP that
changes overnight is still respected. The Shabbat guard is a crude Friday-15:00 to
Saturday-20:00 block; candle-lighting times and chagim are a backlog item, and until then a
Schedule can go out on Yom Kippur.
