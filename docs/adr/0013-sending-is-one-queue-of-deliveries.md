# Sending is one queue of Deliveries drained by one Worker

A Schedule used to be sent by one function call: `sendSchedule` fetched the audience,
resolved the templates and pushed every message out in chunks, and seven callers - the
cron, the Owner's send-now, and five Back Office buttons - each invoked it directly. The
throughput governor lived *inside* that call, so it could only ever govern one Schedule.
Since WhatsApp's **Throughput Budget** belongs to Kululu's phone number and is shared by
every Event at once, two Schedules sending together would each pace themselves correctly
and together breach the limit. The governor was safe only because the cron happened to
loop sequentially.

We split the work in two and made the **Delivery** the unit. A **Dispatcher** finds
Schedules whose **Due Time** has come, resolves their templates, expands the audience and
reserves one Delivery per Guest - all of it database work, none of it touching WhatsApp. A
**Worker** claims queued Deliveries across every Event, oldest first, and sends them at one
pace under a single in-process governor. `message_deliveries` is the queue itself: it
already holds one row per Guest per Schedule, already exists before a message goes out
because the RSVP token has to be inside it, and a Delivery with no attempt is precisely one
that is waiting.

The seam between them is a rendered payload, not a set of ids. The Dispatcher builds each
message in full - parameters resolved, table variant chosen, RSVP link embedded - and
stores it on the Delivery; the Worker reads it, posts it, and records the outcome. It knows
nothing about Guests, Events or Templates. This puts every way a message can be wrong on
the Dispatcher's side, where a failure is one logged row per Schedule rather than hundreds
of per-Guest attempt errors, and it makes a retry resend byte-identical bytes instead of
re-deriving them from a world that has moved on. The cost is that a payload is frozen at
dispatch - seconds before it is sent, and no worse than the old engine, which also resolved
once per send.

**Considered Options:** keeping the Schedule as the unit and coordinating concurrent
workers through a distributed rate limiter was rejected - it adds a limiter to solve a
coordination problem that only exists because we chose to coordinate. A dedicated queue
(`pgmq` is available on the project) was rejected because a second row per Guest would have
to agree with the Delivery that owns the RSVP token. Concurrency was rejected outright: one
worker at 50 MPS drains the largest Event in seven seconds and the whole 100k **Messaging
Tier** in half an hour, so parallelism buys nothing and costs the only genuinely hard
thing.

**Consequences:** `sendSchedule` does not survive; its ten steps are cut across the
Dispatcher/Worker seam, and all seven callers are rebuilt or deleted. Only the Worker talks
to WhatsApp. The Owner's send-now enqueues like everything else and reports "sending to 206
guests" rather than a final count. Back Office bulk sending is gone, replaced by a single
path capped at ten Guests that sends synchronously outside the governor - small enough that
the overshoot stays under the ceiling, and hard-capped in code so it stays that way. A
Schedule is no longer sent or not sent as a unit: partial failure is per-Delivery, which is
why `revertOrCancel` and its 24-hour heuristic are gone too. The queue drains FIFO, not
fairly, so a large Event dispatched first drains before a small one dispatched second -
seconds at current volumes, and a query change rather than a redesign if that ever matters.
