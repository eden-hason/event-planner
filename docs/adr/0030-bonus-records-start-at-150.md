# Bonus Records start at 150 paid records and are always 10

Bonus Records used to be 10 when an Owner paid for up to 200 records and 20 above that, for
any package size (ADR 0024, carried into the Record Package by ADR 0027). They are now
**10 from 150 Paid Records, and none below**, whatever the package size.

The bonus is a marketing perk for a typical event, not a reward that keeps growing with the
package. A flat 10 at one threshold is simpler to explain on the homepage ("10 records free
from 150") and gives a small package a reason to round up to 150 instead of handing the
gift to every package.

Everything else about Bonus Records stays: they are a flat number, never a percentage, worked
out from total Paid Records so a split purchase never stacks them, and an Operator may still
override them per Event. A top-up that brings the total to 150 or more earns the bonus.

**Consequences:** the bonus is computed whenever a package is read, not stored, so the rule
applies to Events that already paid. Events on the automatic bonus with fewer than 150 Paid
Records lose their 10, and those with more than 200 drop from 20 to 10. An Operator who wants
an existing Event to keep its old bonus sets it as an override.
