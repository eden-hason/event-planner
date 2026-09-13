# SMS Fallback is Operator-launched and Guest-level only

Most WhatsApp failures arrive through the webhook minutes after the send call has already
reported success, so the old inline fallback (`SMS_FALLBACK_ENABLED`, reacting only to a
synchronous send error) missed the cases that matter. We decided that an SMS Fallback is a
batch an Operator launches per Schedule from the Back Office, and that it only ever covers
Deliveries that failed for a **Guest-level Failure** and have had no SMS attempt. A
**System-level Failure** - and any error code we have not classified - is excluded, because
it typically hits the whole audience at once and the remedy is fixing Kululu's side and
resending on WhatsApp, not paying for hundreds of irreversible SMS.

**Considered Options:** fully automatic fallback was rejected because a template outage
would fire an SMS at every Guest before anyone noticed. Fully manual with every failure
included was rejected for the same cost reason. The chosen target is a hybrid - automatic
for Guest-level Failures, manual for the rest - and phase 1 ships only the manual half. The
automatic trigger, when it comes, is expected to evaluate a Schedule's failures together
after a settle window (so a burst is recognised as systemic) and to respect quiet hours; it
calls the same batch the Operator's button does.

**Consequences:** opted-out Guests (Meta `131050`) are Guest-level and do receive the SMS.
The SMS carries the Schedule template's same-key SMS version and the Delivery's existing RSVP
link; a Schedule with no SMS version cannot fall back. SMS is never billed to the Owner.
Because nothing is automatic, the Owner's results make no promise of a retry - a failed
Delivery reads "Not delivered" until an SMS attempt actually exists - and the Failed Delivery
Signal is what keeps Operators on it. ActiveTrail offers no delivery webhook, so an SMS
attempt ends at Sent (accepted) or Failed (rejected); polling its reports is a later addition.
