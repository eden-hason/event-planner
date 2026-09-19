# Partners are paid once per referred account, against their own invoice

Kululu Partners is a referral programme for businesses that meet Couples before Kululu does -
DJs, photographers, venues. A Couple arrives through a **Partner**, that makes a
**Referral**, and when the Couple first pays, the Partner earns a fixed **Commission** and
the Couple has already received a **Referral Gift**. Terms are defined in `CONTEXT.md`.

The Referral attaches to the Couple's **account**, not to an Event, and earns exactly once:
the first time any of the account's Events reaches `paid`. A comped Event does not qualify
it, because a Commission is cash out and must follow cash in. Payment in Kululu is per
Event (ADR 0002), so "the user paid for premium" has no referent. Attaching to the account
lets a code be applied before any Event exists, at signup. Paying only once caps the
liability: a family's henna, wedding and later bar mitzva do not pay one DJ three times for
one introduction.

There is one attribution mechanism, the **Partner Code**. A short, permanent, human
word (`ROIDJ`) that the Couple can type, and that the Partner's link (`/join/ROIDJ`) carries
and fills in for them. A Couple who loses the link and finds Kululu on Google can still
type the code, and the gift gives them a reason to. The code can be applied until the
account's first payment, and the payment screen is the most important place to ask for it.
First code wins and is then locked.

The Couple's gift is one extra WhatsApp Schedule with a **Granted** Entitlement on the first
paid Event, not a price discount. It costs agorot per record, needs no payment-provider
support, and reuses a concept that already exists.

The Commission rate is set per Partner and copied onto each Referral when it qualifies, so
renegotiating a rate never rewrites what a Partner was already owed. A Referral that
qualifies in a month goes on that month's **Payout Statement**, issued on the first of the
next month. A statement is paid by bank transfer only after the Partner provides their own
tax invoice or receipt for its exact amount. An Israeli business cannot pay a supplier with
no document behind the payment, and asking the Partner for the document keeps Kululu out of
self-billing. Tax status (עוסק פטור / מורשה / company), bank details and any withholding
certificate (ניכוי במקור) are collected once, at Partner onboarding. The withholding
treatment must be confirmed with Kululu's accountant before the first payout.

A Partner is always invited by an Operator: a single-use, expiring Invitation, then the same
phone OTP or Google login as the main app, on the `partners.` subdomain. A Partner may also
be a Couple, but cannot apply their own code. Ending a partnership stops the code from
accepting new Referrals. Referrals already registered still earn, and the Partner keeps
read-only access to their statements. A Partner sees each referred Couple only as first
names with an initial, Event type and month, and a status, never contact details or
anything inside the Event.

**Considered Options:**

- **Coupon or link, not both.** A link alone loses every Couple who forgets it. A coupon
  alone makes every referral depend on typing. Both, sharing one identity, costs nothing
  extra.
- **Commission on every paid Event, or only on the Event the code was used for.** The first
  is open-ended. The second can't handle a code used at signup, before any Event exists.
- **Holding the Commission until the Event date to absorb refunds.** Rejected as too slow
  for Partners. Refunds are out of scope for now (backlog 0006).
- **Kickback as a percentage.** Rejected because a fixed amount is simpler to explain,
  cheaper to reason about, and doesn't make a Partner care how many guests a Couple has.
- **A separate Partner auth system, or an unauthenticated magic dashboard link.** Rejected
  because Supabase has one user pool, and bank details and invoices can't sit behind a
  forwardable URL.

**Consequences:** a Referral can only qualify once an Event can actually become `paid`, so
this depends on ADR 0021. Refunds are not modelled: a refunded Event leaves its Commission
standing (backlog 0006). The privacy policy needs a line telling a Couple who applies a
code that the Partner will see that they signed up.
