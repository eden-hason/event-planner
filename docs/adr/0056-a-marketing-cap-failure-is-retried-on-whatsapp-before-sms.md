# A marketing-cap failure is retried on WhatsApp before it falls back to SMS

Date: 2026-11-14

## Status

Accepted. Built, not yet deployed. Amends ADR 0016.

## Context

`131049` (Meta's per-user marketing cap) and `130472` (a marketing experiment holdout) are
Guest-level Failures, so a Delivery that hits one is sent an SMS Fallback as soon as its
Schedule settles - about ten minutes. Both codes are Meta withholding a marketing message
from a number for now, not the number being unreachable, so the SMS is often spent on a
Guest WhatsApp would reach later. They arrive through the webhook after Meta accepted the
send, so the retry ladder in `drain-queue.ts` (1, 5, 15 minutes, synchronous throughput
rejections only) never sees them.

## Decision

An **Ask** (the Classic Confirmation, or the current plan's Invitation or Follow-up) whose
WhatsApp fails with `131049` or `130472` gets a **Marketing Cap Retry**: up to two more
WhatsApp attempts, 6 hours and 24 hours after the first failure, each moved to the next
Send Window slot. Only if both fail does the SMS Fallback run, by the ordinary rules. The
24-hour slot is the same time of day as the failure, which was inside the window, so it
always falls after the 6-hour one.

Nothing about the ladder is stored. Which rung a Delivery is on and when its retry is due
are read off its attempts (`utils/marketing-cap-retry.ts`): the number of marketing-cap
failures, timed from the first. A sweeper pass (`queue-marketing-cap-retries.ts`, every
five minutes, before the SMS Fallback pass) re-renders each due retry through the same
renderer an Operator's resend uses and queues it; the Worker sends it like any other queued
Delivery. It has to be re-rendered because the Worker drops `send_payload` - the Guest's
number and name - once a send is accepted, and the failure arrives through the webhook
after that. A ladder nobody manages to run is given up 48 hours after the first failure,
so a render that keeps failing still ends in an SMS.

- **Only the waiting Delivery is held.** The sweeper today treats any queued Delivery as
  "Schedule not settled". A Delivery awaiting a Marketing Cap Retry holds back only its own
  SMS; the rest of the Schedule falls back on today's timing.
- **An answer ends it.** If the Guest has answered by the time a retry is due, the retry is
  dropped and no SMS follows, ever. Asking someone who already answered reads as a bug.
  This also covers a Guest who answers inside the ten-minute settle window, who today
  would still get the SMS.
- **An Operator's action replaces it.** The hold applies to the automatic batch only, so
  the Back Office SMS button still sends at once. A Resend or a Hand Delivery adds a later
  attempt that ends or advances the ladder, and the queue write is guarded on the Delivery
  being unqueued, so a retry and a resend are never both sent.
- **The Owner sees "On its way"** while a retry is pending - a message genuinely is coming,
  and Meta's internals stay Operator facts.
- **Retries are recorded as `scheduled`**, like every other queue send.

The Event Reminder, the Thank You and the Classic Initial Invitation (which does not ask)
are excluded and keep today's immediate fallback: a day-late Reminder arrives after the
Event. So does every other code. Before this decision 286 of the 346 production failures
with these codes were on Confirmations, so the Ask scope covers most of them.

## Considered Options

- **Three retries a few minutes apart** (the first proposal). Rejected on evidence: across
  production, 0 of 13 WhatsApp resends made within 2 hours of a `131049`/`130472` got
  through, over 6 Schedules, each failing again with the same code. The cap is a rolling
  window, and each retry is another marketing send to a number Meta just flagged as
  over-messaged.
- **A controlled 6h-vs-24h experiment** with a 50/50 split. Rejected in favour of applying
  the ladder everywhere and watching results by hand.
- **Counting the Fallback Freeze per Delivery.** Rejected - see Consequences.

## Consequences

- **The evidence for the delays is thin.** The only long-delay data is 11 Operator resends
  after 2 hours or more, 3 of which got through. An earlier reading that "resends a day
  later all work" came from 13 Hand Deliveries, which bypass Meta's cap entirely and prove
  nothing about it. The 6h and 24h rungs are a bet to be checked against real retries.
- **A Guest can be reached up to a day later than today**, by SMS, when both retries fail.
  This is why the rule covers Asks only. An Ask created close to the RSVP Cutoff has no date
  guard and can still be retried past it - accepted for simplicity.
- **The Fallback Freeze still counts attempts**, so a Delivery that fails three times counts
  three failures: 10 marketing-cap failures among 100 Guests read as 10% today and 25% after
  both retries. More Schedules will reach the 30% line and wait for an Operator.
- **Monitoring has no label of its own.** A Marketing Cap Retry is told apart from a first
  send only by being a later WhatsApp attempt on a Delivery whose earlier one failed with
  `131049`/`130472`.
