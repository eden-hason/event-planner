# A send is claimed before it is made

WhatsApp's `/messages` endpoint has no idempotency key, so a send whose outcome we never
learned can never be safely retried: we cannot ask whether it already went out. The old
engine sent first and recorded afterwards, and the gap between the two is real - Vercel
killing the function at `maxDuration`, a deploy tearing down the instance mid-send, or
simply the attempt insert failing, which the code logged and walked past while twenty-five
messages were already gone. On the next run those Deliveries looked untouched and were sent
again.

We chose **at-most-once**. The Worker claims a Delivery by inserting its **Delivery
Attempt** as `pending` *before* calling WhatsApp, in one statement using `for update skip
locked`, and a Delivery with an attempt is no longer queued. A crash in the gap therefore
leaves an attempt nobody ever resolved, and that guest is never written to twice. A reaper
ages a `pending` attempt older than ten minutes to `failed` with **no error code**, which
`classifyWhatsAppFailure` already reads as **System-level** - so a stranded send is
automatically kept out of the automatic **SMS Fallback** and put in front of an Operator
instead, with no new status and no new enum value.

A rejection WhatsApp actually answered with is a different thing and is retried: there the
message provably did not go out, so there is no duplicate to create. Transient codes (429,
5xx, `130429`, `131056`, `133016`) get three attempts at one, five and fifteen minutes; a
**Guest-level Failure** never retries, because a number that is not on WhatsApp will not be
on WhatsApp in fifteen minutes. The line is drawn at whether an HTTP response came back at
all - a thrown `fetch` may well have reached Meta and counts as unknown, not as rejected,
which is why the old catch-all that flattened both into one shape had to go.

**Consequences:** a guest can receive nothing when Kululu crashes mid-send, and recovering
them needs an Operator. That is the deliberate trade - a duplicate wedding invitation
cannot be taken back, while silence is recoverable as long as it is visible, and the Failed
Delivery **Signal** is what makes it visible. Retry, first dispatch and an Operator's resend
all re-enter the queue through one `message_deliveries.next_attempt_at` column rather than
three separate rules; it is scheduling, not state, so ADR 0011 still holds and nothing
writes the Delivery's status by hand.
