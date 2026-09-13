# A Delivery is rolled up from its attempts

`message_deliveries` held one row per Guest per Schedule and every send path upserted onto
it, so an SMS fallback or an Operator resend overwrote the WhatsApp record - its status,
its error, and the `confirmation_token` the earlier message's RSVP link resolves through.
We split the concept: a **Delivery** (one per Guest per Schedule, still `message_deliveries`,
owning the RSVP token) is made of **Delivery Attempts** (one per message on one channel, in a
child table, never overwritten). The Delivery's state is the best any attempt reached -
Read, then Delivered, then Sent, then Failed - maintained in the database rather than by
each writer.

We kept the `message_deliveries` name instead of introducing fresh `deliveries` /
`delivery_attempts` tables because fourteen readers (the RSVP flow, the Failed Delivery
Signal, the Overview, the Back Office send plans) and its RLS policies already depend on
it, and there is no sandbox between local and production to absorb a wholesale rename. We
rejected turning `message_deliveries` into the attempts table with a derived view, because
the RSVP token would then have no single owner.

**Consequences:** two rankings coexist and both are right. Within one attempt `failed` is
terminal and outranks everything (a late `delivered` is a duplicate, not a recovery); across
attempts Failed ranks lowest (a later failure never un-reaches a Guest). A resend meant to
*replace* stale content still leaves the Delivery at Read if the old message was read - send
corrected content as a new Schedule, not a resend. "Not sent" (no usable phone) is recorded
from this change onward only; earlier sends never stored it.
