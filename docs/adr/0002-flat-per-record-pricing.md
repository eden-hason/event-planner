# 2. Flat per-record pricing replaces tiers

Date: 2026-08-14

## Status

Accepted

## Context

Pricing was modelled twice, and the two models had already drifted apart.

In the code it is tiered. `PLAN_CAPACITY` in `src/features/events/constants.ts`
defines `tier_100` through `tier_400`; `EventOnboardingSchema` accepts a
`pricingPlan` from that enum; `createOnboardingEvent` translates the tier into
`events.guests_capacity`; the guests page reads that capacity as a ceiling; and
`profiles.pricing_plan` carries a plan enum that the admin back office reports
on. `CONTEXT.md` defines **Reserve Records** as free records granted "at 10% of
the plan's size", which only means anything if plans have sizes.

On the public homepage it is not tiered. The wedding offer section advertises
`1.5 ₪ לרשומה` - a flat per-record rate, charged once, at the moment
invitations are sent, with everything free until then. There are no tiers on
that page at all. Only the FAQ still speaks tier language, promising an upgrade
path "to a bigger package, crediting what you already paid" alongside the 10%
reserve.

The onboarding redesign forces the question, because its fifth screen is a
price estimator: a slider for expected guest records and a channel choice
(WhatsApp or the cheaper SMS), quoting a price. An estimator cannot quote
against two contradictory models.

The tier model also costs something real. It requires the couple to guess their
final guest count early enough to buy the right box, and then punishes the
guess: cross the line by one record and you buy the next tier. Reserve Records
exist entirely to soften that edge. Both the tiers and their compensating
mechanism disappear if the price is simply linear.

## Decision

Price is `records × rate`, where the rate depends only on the delivery channel.
SMS is cheaper than WhatsApp. There are no plans, no tiers, no capacity, and no
upgrade path, because there is nothing to upgrade from.

Payment is unchanged in timing and stays where the homepage already puts it: at
schedule kick-off, when the guest list is real and the count is known. Nothing
in onboarding takes payment, and the estimator's channel toggle is not binding
(see the onboarding brief).

**Reserve Records retire.** With no plan size, "10% of the plan" has no
referent, and the problem they solved - the cliff at a tier boundary - no
longer exists. The term is removed from `CONTEXT.md` and the 10% promise is
removed from the homepage FAQ.

## Consequences

**Good.** One model, and it is the one already advertised publicly. The couple
is never asked to guess a bracket, never blocked by a ceiling, and never has to
understand what a reserve record is. The estimator can be a smooth slider
rather than four boxes, which is why the onboarding screen works at all.

**Bad.** Two rates where the homepage currently advertises one. The `1.5 ₪`
figure is live marketing copy and now needs to read as the WhatsApp rate, with
an SMS rate published beside it. That is a marketing change, not just a product
one, and it must land before or with this.

The FAQ's upgrade-and-credit answer and its 10% reserve answer both become
false and have to go.

`PLAN_CAPACITY`, `EventOnboardingSchema.pricingPlan`, `events.guests_capacity`
and `profiles.pricing_plan` become legacy. The guests page stops enforcing a
ceiling. `profiles.pricing_plan` is read by the admin users list, so it cannot
simply be dropped without touching the back office.

**If we change our mind.** Reintroducing tiers means restoring a capacity
concept the product will by then have shipped without, and re-teaching users a
model they were never shown. Going linear is easy to do and unpleasant to undo,
which is the main reason to be sure now.
