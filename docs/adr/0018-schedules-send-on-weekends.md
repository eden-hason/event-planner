# Schedules send on weekends

ADR 0015 gave the **Send Window** two rules: a daily 09:00 to 21:00 Israel window, and a
Shabbat block from Friday 15:00 to Saturday 20:00. We removed the Shabbat block. A Schedule
whose Due Time falls on a Friday afternoon or a Saturday now goes out at that time, under
the same daily window as any other day.

The block held weekend sends by up to 29 hours, which is too late for the messages it caught
most often. An Event Reminder for a Saturday-night Event arrived at 20:00, as guests were
already on their way (backlog 0002, open question 3).

**Considered Options:** making the block right, with real candle-lighting times and chagim,
was the backlog item. It would still hold weekend sends, so it does not solve the problem.
A per-Event opt-out was not built. It adds a setting for Owners to find, and nobody has yet
asked for a weekend sending policy that varies by Event.

**Consequences:** Kululu now messages guests on Shabbat, and on chagim. It already did on
chagim, which the block never covered. Guests who keep Shabbat will receive messages on it.
The longest hold is now overnight, about 12 hours. `SCHEDULE_MAX_LATENESS_HOURS` stays at
48: it was sized for the Shabbat hold, and it now just leaves room for a Dispatcher outage.
Backlog 0002 is dropped.
