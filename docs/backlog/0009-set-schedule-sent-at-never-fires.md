# The trigger that stamps `schedules.sent_at` never fires

Status: open

## The problem

`set_schedule_sent_at` is a `BEFORE UPDATE` trigger on `schedules` whose whole body is:

```sql
IF NEW.status = 'sent' AND OLD.status != 'sent' THEN
  NEW.sent_at = NOW();
END IF;
```

A Schedule's ordinary life is `NULL -> 'sent'`. On that transition `OLD.status` is `NULL`,
so `OLD.status != 'sent'` evaluates to `NULL`, the whole condition is `NULL`, and the `IF`
does not run. The trigger has therefore never stamped `sent_at` on the transition it was
written for. It would only fire going from `'cancelled'` or `'expired'` to `'sent'`, which
is not a path anything takes.

Spotted while adding the `'disabled'` status; unrelated to that change, and deliberately
not fixed in the same diff.

## What is known

- The correct predicate is `OLD.status IS DISTINCT FROM 'sent'`.
- This has not been visibly broken, which is the interesting part and needs establishing
  before changing anything: either the application sets `sent_at` explicitly on the same
  update, or `sent_at` is mostly null in production and nothing important reads it. The
  schedules page reads `schedule.sentAt` for a sent Schedule's timestamp and falls back to
  `scheduledDate`, so a null there is invisible.
- Fixing the trigger changes behaviour for every future send, so it wants a look at how
  many existing `sent` rows have a null `sent_at` first - that count is both the evidence
  and the size of any backfill.

## Options already considered

- **Fix the predicate and backfill.** Correct, but the backfill has no honest value to use
  for historical rows: `updated_at` is the closest thing and is not the same fact.
- **Fix the predicate, leave history alone.** Rows sent before the fix keep their null and
  the page keeps falling back. Probably right, but it leaves the column meaning two things.
- **Delete the trigger and have the send path write `sent_at` explicitly.** One writer
  instead of two. Needs checking that every path that sets `status = 'sent'` is in the
  application and not in SQL.

## Done means

`schedules.sent_at` is either reliably stamped or deliberately removed, and whichever it is
is written down rather than left as a trigger that looks like it works.
