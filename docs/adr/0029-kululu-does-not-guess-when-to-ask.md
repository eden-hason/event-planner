# Kululu does not guess when to ask

Every Schedule used to be seeded with a Due Time computed from the Event date: Initial
Invitation at -30 days, Confirmations at -21 and -14, all at 10:00. We stopped doing that for
Initial Invitations and Confirmations. They are now seeded as **Undated Schedules** and
never send until the Owner picks a Due Time. Event Reminders, Thank Yous and call plans keep
their proposed date, which the Owner may still change.

A seeded date read as a decision nobody had made. When an Event started paying, its whole
plan became active at once, and an invitation due in the past went out to the Owner's
guests without warning (backlog 0014: 99 guests at 16:14). When to invite and when to ask
for an answer depends on the Owner's own plans, for example invitations already sent on
paper. The day-of reminder and the thank-you depend only on the Event date. Call plans are
started by a person (ADR 0004), so a proposed date cannot reach a Guest by itself.

The rule lives in the catalog: a null `days_offset` on `event_type_default_schedules` means
"the Owner dates it", and the seed writes `scheduled_date = null`.

**Considered Options:** keeping seeded dates and confirming them on payment was rejected.
The Owner would be asked to approve a plan they never made. Suggesting the old default in
the date picker was rejected because it brings back the guess one click later. A per-type
flag on `schedule_types` was rejected in favour of the catalog, which already holds every
other seed default per Event type.

**Consequences:**

- **No date, nothing sent.** An Owner who never dates an ask sends nothing. Two derived
  conditions cover this, and both clear once any Initial Invitation or Confirmation is dated
  or sent:
  - a Featured Action on Home, while the Event can send;
  - the **No Ask Planned** Signal, within 21 days of the Event.
- **Undated is not a way to turn a Schedule off.** It is a starting state. A dated Schedule
  can be re-dated but never cleared, so "not decided yet" never blurs into "decided not to
  send" (backlog 0010).
- **Locked rules unchanged.** A locked Schedule still cannot be dated until its Event can
  send.
- **Backfill.**
  - Outstanding `disabled` rows were un-dated, since their Owners could never have chosen
    those dates.
  - Active rows on Events that can send were left alone, since those Owners may rely on
    them.
- **Changing the Event date** (backlog 0008) now leaves fewer Schedules behind: the
  Reminder, the Thank You, and dates the Owner chose.
