# SMS Fallback runs by itself, unless too much failed at once

ADR 0012 shipped the manual half of a hybrid it had already designed: an SMS Fallback
covering only **Guest-level Failures**, launched by an Operator, with the automatic trigger
left for later and expected to "evaluate a Schedule's failures together after a settle
window" and call the same batch. This is that trigger. Full automation was worth doing now
because nothing else remained holding a human in the loop - once the cron dispatches and
sends by itself, waiting for an Operator to notice a failure is waiting for nobody.

A sweeper hands a Schedule to the existing `sendSmsFallback` engine, unchanged, once it has
finished failing. "Finished" is judged on queue state rather than the clock: no Delivery
still queued, no attempt still `pending`, no retry outstanding, and no attempt activity for
ten minutes. Conditions one to three make the window self-adjusting, so a Schedule midway
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
