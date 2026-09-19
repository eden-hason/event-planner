# The Shabbat guard is a fixed weekly block, not a calendar

Status: dropped - the Shabbat block was removed outright rather than made accurate, see `docs/adr/0018-schedules-send-on-weekends.md`
Area: schedules / outreach
Related: `docs/adr/0015-a-due-time-is-a-request-not-an-instruction.md`, CONTEXT.md (Send Window)

## The problem

The **Send Window** blocks Friday 15:00 through Saturday 20:00 Israel time, as a fixed
weekly rule. Real Shabbat does not work that way, and neither do chagim.

Two things are wrong with the approximation, in opposite directions:

- **It blocks too little.** Shabbat starts at candle-lighting, which moves through the
  year - roughly 16:00 in Jerusalem in late December, and past 19:15 in June. On a winter
  Friday the window is open for an hour after Shabbat has begun. And it knows nothing
  about chagim at all: Yom Kippur, the first and last days of Pesach, Rosh Hashana,
  Shavuot and Sukkot are ordinary sending days as far as the Dispatcher is concerned.
  A wedding invitation going out at 10:00 on Yom Kippur is the failure case.
- **It blocks too much.** Havdala in midsummer is around 20:15, so a fixed 20:00 reopening
  is mildly early rather than late - but the same 20:00 in winter holds messages back for
  more than two hours after Shabbat has ended.

Times also differ by city (Jerusalem lights ~40 minutes before sunset, most of the country
~20), so "correct" depends on whose Shabbat is meant. Kululu has no location on a Guest and
would be choosing a single national convention regardless.

## Why it was deferred

Nothing about it is hard to *reason* about, but it needs a Hebrew calendar and a zmanim
calculation, which means either a dependency (`@hebcal/core` is the obvious candidate) or a
precomputed table. The crude block catches the great majority of the harm for about twenty
lines, and the Dispatcher's hold/release machinery is identical either way - only the
predicate changes. See ADR 0015.

## What is known about the moving parts

- The guard lives in the Dispatcher and is evaluated at dispatch time, not authoring time,
  so a corrected predicate needs no migration and no change to stored Due Times.
- A Schedule held over Shabbat can wait about 29 hours today. `SCHEDULE_MAX_LATENESS_HOURS`
  is 48 specifically to clear that. **A longer hold - a three-day chag adjoining Shabbat
  runs past 72 hours - would silently expire Schedules the guard itself held.** Any real
  calendar implementation must revisit the lateness cutoff in the same change.
- `ADMIN_TIME_ZONE` (`Asia/Jerusalem`) in `src/lib/date-time.ts` is the existing single
  source of timezone truth and handles DST; the guard should not introduce a second.

## Open questions

1. Which city's zmanim? Jerusalem is the strictest and the safest default, but it holds
   every send ~20 minutes longer than the rest of the country needs.
2. Do chag *eves* and chol hamoed count? Erev chag behaves like erev Shabbat; chol hamoed
   is an ordinary weekday for most people and blocking it would be over-reach.
3. Should an Owner be able to opt out? A secular couple with a Saturday-night wedding needs
   the Event Reminder to arrive Saturday morning, and the guard would hold it until 20:00 -
   arriving as guests are already leaving. No Saturday Events exist yet (18 Events: Wed 7,
   Thu 6, Tue 3, Fri 1, Mon 1), so this is not yet urgent, but Saturday-night weddings are
   common in Israel and the first one will hit this.
4. Is the right fix in the Dispatcher at all, or in authoring - refusing to let a Schedule
   be given a Due Time that lands on Shabbat, so the Owner sees and resolves it?

Question 3 is the one that decides whether this is a calendar problem or a product problem.

## Done means

- No Schedule dispatches during Shabbat or a chag, computed rather than approximated.
- A Schedule held by the calendar is never expired by the lateness cutoff for having been
  held.
- The Saturday-night-Event case has an answer recorded in `docs/adr/`.

## Not in scope

- Per-Guest observance. Kululu knows nothing about an individual Guest's practice and
  should not start guessing.
- Quiet hours generally - 09:00 to 21:00 is settled (ADR 0015).
