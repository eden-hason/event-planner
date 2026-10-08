# An interrupted dispatch is resumed, not redone

On 2026-10-08 a 513-guest Confirmation was claimed by the Dispatcher, rendered in four
seconds, and then queued one `UPDATE` per Guest at about 180ms each - the function runs in
Vercel's `iad1` and the database lives in `eu-central-1`. The 60-second budget ran out after
311. Vercel killed the function, 202 Guests were left with a Delivery but no payload, no
queue time and no attempt, and the dispatch log had no row at all. Because the claim
(`schedules.dispatched_at`) had already been taken, nothing ever looked at that Schedule
again: those Guests sat at "on the way" with nothing on the way.

We made two changes, and the second is the decision.

**Queueing is one transaction.** `queue_dispatch` writes every rendered Delivery and the
`dispatched` log row in a single statement-and-insert, so a dispatch either finishes or
leaves nothing behind. That turns "claimed, but no `dispatched` row" into an exact
definition of an **Interrupted Dispatch**, rather than a guess.

**An Interrupted Dispatch is resumed for the Guests it never reached.** Every Dispatcher run,
after the due Schedules, looks for claims at least ten minutes old with no `dispatched` row,
re-renders them, and queues only Deliveries that have never been attempted and are not
queued. A Delivery with an attempt is never queued from here again, so ADR 0014's
at-most-once holds across a resume: the Guests who were reached are not written to twice,
and the ones who were not are no longer silently dropped. A per-Schedule advisory lock and
the `dispatched` row make two overlapping Dispatchers finish a Schedule once.

Redoing the dispatch was rejected - releasing the claim and letting the normal sweep pick the
Schedule up again. With the old per-row queueing a partial dispatch had already queued and
sent to part of the audience, and a redo would have re-sent to all of them. With atomic
queueing a redo would be safe, but it would still discard the record that the Schedule was
claimed on time and push it back through expiry rules measured from the Due Time.

The resume obeys the same rules as a dispatch, measured from the claim rather than the Due
Time: it is held outside the **Send Window**, and it stops for good once the Event has
passed or the claim is more than 48 hours old - logged as `expired` without marking the
Schedule expired, since part of its audience did get the message. Three failed tries since
the claim end it too, spaced ten minutes apart, so a Schedule that cannot render does not
write a failure a minute for two days, and a transient cause - a deploy landing before its
migration - has half an hour to clear.

**Consequences:** the Guests a resume reaches get the message late, and the log says so -
the `dispatched` row carries "Resumed an interrupted dispatch", so an Operator can tell a
recovery from a normal send. A resume re-expands the audience as it stands, so a Guest added
between the claim and the resume is included; they had not received it either. The dispatch
route's `maxDuration` went from 60 to 300 seconds to match the Worker, and the resume waits
longer than that before calling a claim interrupted. The Operator's manual send still queues
row by row - it is capped at ten, and a resend must re-queue Guests who were already
attempted, which `queue_dispatch` deliberately refuses.
