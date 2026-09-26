# Bonus Records are a flat gift, not a reserve

The homepage pricing simulator gives free extra Guest Records on top of the paid ones: 10
when the Owner pays for up to 200, 20 above that. ADR 0002 retired **Reserve Records**
("10% of the plan's size") along with tiers, and this brings free records back, so it
needs to say why it does not bring the tier model back with them.

Bonus Records are a marketing perk, not a buffer against a bracket edge. The count is a
flat step on the number of paid records, not a percentage of a plan, and there is still no
plan, no ceiling and no upgrade path: price stays `records × rate`, and more records are
added at the same rate. The simulator shows the bonus as its own line, "ללא עלות", so it
never reads as part of the rate.

The homepage publishes three channel rates (SMS 1 ₪, WhatsApp 1.5 ₪, WhatsApp + calls 2 ₪),
kept in `src/app/(main)/[locale]/_components/pricing.ts`. The price estimate screen that ended
onboarding, which ADR 0002 introduced, is removed rather than kept in step with them: the
homepage is now the one place a price is quoted, so there is no second set of rates to
drift. Onboarding ends at the venue question, `guests_estimate` is no longer set, and a
stored `onboarding_step` of `estimate` is read as every question answered.

**Not yet decided:** where Bonus Records are granted in the product. Nothing at payment
time adds them today, so the homepage promises something billing does not yet do.
