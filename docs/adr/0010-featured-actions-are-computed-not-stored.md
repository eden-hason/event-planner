# Featured Actions are computed, not stored

Home replaces the per-event dashboard's separate Onboarding Checklist with a single
Featured Action mechanism: each candidate action (finish an unfinished setup step, send
an RSVP reminder, try a new capability, etc.) carries its own eligibility rule evaluated
from the Event's current state, the same way a Back Office **Signal** works. We rejected
keeping a distinct checklist model, and rejected adding per-action dismissal, because
either would require persisted per-Owner state ("seen", "snoozed", "done") that the rest
of the system doesn't need and that could drift from reality. An action disappears only
when its rule turns false - never because it was hidden.

**Consequences:** there is no admin surface, migration, or table for "which actions has
this Owner dismissed" - if a future request needs that (e.g. "let me hide this
permanently"), it is new scope, not a bug fix.
