# The Owner cannot tell which guest numbers WhatsApp or SMS can reach

Status: open
Area: guests / outreach
Related: `docs/backlog/0001-sms-delivery-visibility.md`,
`docs/backlog/0017-import-guests-from-whatsapp.md`,
`docs/backlog/0025-guests-abroad-are-whatsapp-only.md`,
`docs/adr/0016-sms-fallback-runs-by-itself-unless-too-much-failed.md`

## The problem

A guest's phone number is checked only for being valid (`isValidGuestPhone`,
`src/lib/phone.ts`). Nothing tells the Owner, before or after a send, whether that number
has WhatsApp, can take an SMS, or is connected at all. The Owner learns it only by reading
one Schedule's results, and the next Event starts from nothing again.

## Evidence (production, 2026-11-05)

- 6,990 guests with a phone; 6,934 are Israeli mobile (`+9725…`).
- 8,026 WhatsApp attempts, 400 failed. By error code: `131026` (not on WhatsApp) 179
  attempts / 98 guests, `130472` 125 / 69, `131049` 93 / 75, and three one-offs.
- **The 98 guests not on WhatsApp are mostly unreachable by SMS too.** All 98 got an SMS
  fallback: 62 failed, 29 delivered, the rest unknown. These numbers are dead or blocked on
  both channels, not "SMS-only".
- The SMS failures among them are concentrated in a few prefixes: `05041` (8 of 18 guests
  with that prefix), `05484` (5 of 8), `05276` (3 of 7), `05271`. Everything else is spread
  out. These look like **kosher line** ranges, which by design take no WhatsApp and no
  SMS (or no SMS with a link). That is a guess from the data; the ranges are **not verified**
  against an official list.

`130472` and `131049` are Meta withholding marketing messages from a number, not a sign the
number lacks WhatsApp. A classifier must not read them as "no WhatsApp".

## Options checked

### 1. Learn from our own sends (free, accurate, after the fact)

Every attempt already records channel, status and `error_code`. A reachability state per
number follows directly:

| Signal | Means |
|---|---|
| WhatsApp `delivered`/`read` | Has WhatsApp |
| WhatsApp failed `131026` | No WhatsApp (or a client too old) |
| SMS `delivered` | Takes SMS |
| SMS failed (poll, 0001) | SMS does not reach it |
| `131026` + SMS failed | Unreachable by message: needs a call or a new number |

No vendor, no cost, no guessing. Its limit is that it only knows a number after the first
send. Because it is keyed by number, it could also carry across Events: a number seen as
"no WhatsApp" at one wedding is very likely the same at the next. That shares a fact about
a number across Owners, so it needs a privacy decision first. The fact itself is not
shown to the other Owner as history, only as "this number may not have WhatsApp".

### 2. Kosher-line prefixes (free, offline, before any send)

Kosher lines were given their own ranges per carrier by design (the "kosher floor",
קומה כשרה), so a prefix list flags them when the guest is added. **No official,
machine-readable list was found.** The Rabbinical Committee for Communications and the
carriers set the ranges; the Ministry of Communications numbering plan lists operator blocks,
not which are kosher. The list below comes from secondary sources (a vendor help page, Hebrew
Wikipedia, news reports), all undated:

| Carrier | Ranges |
|---|---|
| Pelephone | 050-41 |
| Cellcom | 052-71, 052-76 |
| Partner | 054-84, 054-85 |
| Hot Mobile | 053-31, 053-41, 053-51 |
| Golan | 058-32 |
| Rami Levy | 055-67 |
| 019 (Telzar) | 055-98 |
| Free Telecom / x2one | 055-32 |
| Cellact | 055-71 |

**Checked against production (2026-11-05):**

| Israeli mobile guests sent to | Sent to | WhatsApp worked | Not on WhatsApp (`131026`) | Not on WhatsApp, and SMS failed too |
|---|---|---|---|---|
| In a range above | 35 | 9 (26%) | 21 (60%) | 21 (all of them) |
| Everyone else | 3,934 | 3,255 (83%) | 77 (2%) | 40 |

- The flag is a strong predictor: 60% "no WhatsApp" against 2%, and **not one** in-range guest
  without WhatsApp was reached by SMS. The remedy for them is a call, never an SMS fallback.
- It covers a third of the guests unreachable on both channels (21 of 61). The other 40 are
  spread across ordinary ranges: dead numbers, or kosher lines the list misses.
- It is not a certainty: 9 in-range guests did get WhatsApp, 6 of them in the best-attested
  ranges (050-41, 052-71, 052-76: 2 each). That points at numbers, not at wrong ranges. Two
  likely causes, neither confirmed: since the Ministry's portability reform (Minister Hendel,
  about 2022) a kosher number can move to a regular line and keep its number; and WhatsApp can
  be registered on another device with a voice-call code, which a kosher line can take. So the
  prefix decays as a signal over time. Label it "probably kosher".
- `05598` and `05351` each had an SMS delivered, so those two entries are the least trusted.
  `05331`, `05532`, `05571` have no guests yet.

**Keeping the list honest.** Store it as data with a source and a review date, not as logic
spread around. The send history can keep checking it: per range, the share of `131026` + SMS
failed. A range on the list that keeps delivering should be questioned, and an unlisted range
that keeps failing both ways is a candidate to add (needs a minimum count, since 61 guests are
too few to find new ranges today).

**Product shape.** A small marker on the guest ("מספר כשר - כנראה לא יקבל וואטסאפ או SMS"),
a count on the guest list, and a nudge toward a call round on the plan that has calls
(ADR 0034). It should not block sending: a WhatsApp still costs one attempt, and 26% of these
numbers do have it.

### 3. Paid line lookup (before any send, per-lookup cost)

- **Line type / carrier** (e.g. Twilio Lookup v2 Line Type Intelligence, about $0.008 per
  lookup on the US price page, Israel rate not confirmed): mobile vs landline vs VoIP, plus
  carrier. Almost no value here: validation already only accepts Israeli mobiles, and number
  portability makes the carrier informational only.
- **HLR lookup** (hlr-lookups.com, hlrlookup.com and others): asks the network whether the
  number is live, absent or ported. This is the one that catches **disconnected numbers**
  before the send. Israel coverage, accuracy and price are not confirmed; ask a vendor
  before building. It does not detect kosher lines or WhatsApp.

At the current 6,990 guests, a one-off lookup on every number would cost tens of dollars.
Per Event, it would be added to the flat per-record price (ADR 0002).

### 4. Ask WhatsApp whether a number is registered

- **Official API: not available.** The Cloud API we send with has no "is this number on
  WhatsApp" endpoint. The `contacts` check existed only on the On-Premises API, which Meta
  has retired. The only official signal is sending and getting `131026` back.
- **Unofficial (Baileys `onWhatsApp()`):** the WhatsApp import (0017) already runs a
  linked-device client, which can check numbers in bulk. Rejected as a classifier: it breaks
  WhatsApp's terms, a bulk check is the kind of traffic that gets a number banned, and the
  ban would fall on the Owner's own number (or Kululu's, if run from ours). One safe side
  effect: a guest imported *from* a WhatsApp group or chat is on WhatsApp by definition, so
  the import can record that for free.

## Suggested order

1. Reachability from our own attempts (option 1), shown in the guest list and drawer as a
   small badge. This is mostly a query and a component.
2. Flag the kosher ranges at entry (option 2). The production check above already supports it.
3. Only if dead numbers remain a real share of failures, trial an HLR vendor on a sample of
   the 62 known-unreachable numbers to see whether it would have caught them before paying
   for it at scale.

## Still unknown

- An authoritative kosher range list. Ask the carriers or the Rabbinical Committee for
  Communications; the table above is from secondary sources.
- Whether some kosher lines take SMS (banking and Home Front Command alerts pushed for it).
  Production says none of ours did.
- Whether an HLR vendor reports Israeli numbers accurately (some carriers answer HLR queries
  partly or not at all, so test on known numbers) and at what price.
- Whether reachability should be shared across Events and Owners (privacy policy).

## Done would mean

The Owner sees, per guest, whether the number has WhatsApp, takes SMS, or needs a call,
before the next send where it is already known, and a kosher number is flagged as soon as
it is added.
