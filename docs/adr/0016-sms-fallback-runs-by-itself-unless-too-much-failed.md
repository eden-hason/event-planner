# SMS Fallback runs by itself, unless too much failed at once

ADR 0012 shipped the manual half of a hybrid it had already designed: an SMS Fallback
covering only **Guest-level Failures**, launched by an Operator, with the automatic trigger
left for later and expected to "evaluate a Schedule's failures together after a settle
window" and call the same batch. This is that trigger. Full automation was worth doing now
because nothing else remained holding a human in the loop - once the cron dispatches and
sends by itself, waiting for an Operator to notice a failure is waiting for nobody.

A sweeper hands a Schedule to the existing `sendSmsFallback` engine, unchanged, once it has
finished failing. "Finished" is judged on queue state rather than the clock: no Delivery
still queued, no attempt still `pending`, no retry outstanding, and no attempt made or failed
for ten minutes. Conditions one to three make the window self-adjusting, so a Schedule midway
through the retry ladder simply is not ready; the ten minutes is only there to cover webhook
lag, which has been at most 122 seconds across every failure observed.

The widening the automation tempted us into - treating every failure as a fallback
candidate - was rejected again, for the reason ADR 0012 gave. But the residual risk turned
out to be narrower and different. A template outage or an expired token produces codes
outside `GUEST_LEVEL_CODES`, so `classifyWhatsAppFailure` already excludes them; the
scenario ADR 0012 feared is handled. What is not handled is a systemic problem *wearing* a
guest-level code: `131049` and `130472` are both WhatsApp deciding something about Kululu's
account, not about one Guest, and both can spike across a whole audience. So we added a
**Fallback Freeze** - above 30% of a Schedule's attempts failing, with at least ten
failures, the automatic batch is withheld entirely.

**Consequences:** the Freeze is a cost-and-awareness control, not a correctness one. Those
Guests genuinely did not receive the WhatsApp and SMS would genuinely reach them; what the
Freeze prevents is Kululu spending unplanned money automatically at the moment its WhatsApp
account is in trouble, when fixing the account and resending for free may be the better
remedy. 30% sits about three times above the worst rate yet observed on a real Schedule
(11%), and the floor of ten stops a five-guest test Event freezing over two failures. The
Freeze lives in the sweeper and never in `sendSmsFallback`, so the Back Office button is
untouched and an Operator who has read the failures remains the way past it - which is
precisely the manual half ADR 0012 shipped. Silence is still not treated as failure: an
attempt accepted but never confirmed delivered is not a fallback candidate, because zero of
the 320 observed attempts ended up there and guessing that "not yet" means "never" is the
trap `docs/backlog/0001` names for SMS.

**Amended 2026-09-29:** "activity" originally meant any change to an attempt, which included
delivered and read receipts. Those trickle in for hours as guests open the message, so on
a real audience the ten quiet minutes rarely came and Operators pressed the button instead.
Only an attempt being made or failing now counts. The sweeper's attempts are recorded as
`fallback_auto` and the button's stay `fallback`, so the two can be told apart; both are
still limited to one per Delivery.

**Amended 2026-10-07:** silence is now a fallback case after all, within bounds. A real
Schedule (`c40689a5`) left one Guest's WhatsApp accepted and unconfirmed for a day, and
the Guest was never reached. Getting both an SMS and a late WhatsApp is the better
failure. A WhatsApp accepted at least 2 hours ago (`SMS_FALLBACK_STUCK_MIN_HOURS`) with no
delivered receipt, and not more than 72 hours ago (`SMS_FALLBACK_STUCK_MAX_HOURS`), is a
candidate for the button and the sweeper. The ceiling is not optional: production holds
hundreds of August sends that never recorded a receipt, and they must never be picked up.
Stuck deliveries do not count toward the Fallback Freeze, which still measures failures
only.
