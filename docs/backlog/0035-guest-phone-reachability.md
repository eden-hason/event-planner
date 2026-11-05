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

If the kosher ranges can be confirmed (from the carriers or the Ministry of Communications
numbering plan, `https://www.gov.il/BlobFolder/rfp/27032023/he/Numbering_Plan_032023.pdf`),
a static prefix list flags these guests when they are added: "kosher number - reach by
phone call". This is the cheapest high-value signal for the Israeli market. Note number
portability: a kosher SIM cannot be ported off its range, but a range list still goes stale,
so keep it as data with a review date, not hard-coded logic spread around.

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
2. Verify the kosher ranges and flag them at entry (option 2).
3. Only if dead numbers remain a real share of failures, trial an HLR vendor on a sample of
   the 62 known-unreachable numbers to see whether it would have caught them before paying
   for it at scale.

## Still unknown

- Whether the `05041` / `05484` / `05276` / `05271` ranges really are kosher, and the full list.
- Whether an HLR vendor reports Israeli numbers accurately (some carriers answer HLR queries
  partly or not at all, so test on known numbers) and at what price.
- Whether reachability should be shared across Events and Owners (privacy policy).

## Done would mean

The Owner sees, per guest, whether the number has WhatsApp, takes SMS, or needs a call,
before the next send where it is already known, and a kosher number is flagged as soon as
it is added.
