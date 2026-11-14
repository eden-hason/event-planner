# A Personal Message is the Owner's whole message, in paragraph-slot templates

Date: 2026-11-07

## Status

Accepted. Not built. Amends ADR 0046 for Events on the current Message
Plan (ADR 0053); its Marketing
category, no content rules and same price all still hold.

## Context

The Personal Message of ADR 0046 is one paragraph inside a Kululu frame that carries the
greeting, the date and the venue. Owners want to write the whole message in their own
voice and still name the Event's facts without retyping them. Two WhatsApp limits shape
any answer. A template body may not be only a variable, or open or close on one. And a
variable may not contain a line break (132018): today each Enter is sent as ` | `.

## Decision

- **Whole message, blank page.** The Owner writes the entire text from an empty editor.
  Kululu adds only the stage's **Wrapper**: a fixed opening line that names the stage
  ("הזמנה לאירוע 💌") and a fixed closing line that leads to the buttons. The Reminder's
  Wrapper is the same on any day.
- **Message Fields.** The Owner can insert the Event's facts (hosts, Occasion Phrase, date,
  venue name, reception and ceremony times), the Guest's name as written in the guest
  list, and on the Reminder a table sentence. All are filled in at send time. A table
  sentence is left out for a Guest with no table, and for every Guest while the Event's
  "send table numbers" switch is off. There is no venue address field (amended
  2026-11-13): an Event stores its venue's name and coordinates, not an address.
- **No content checks.** Kululu does not require or suggest the date or the venue. A field
  that is empty when the Owner saves cannot be saved. A field that becomes empty later is
  sent empty.
- **Paragraph slots.** Up to three paragraphs, so there are three Meta templates per stage
  shape (1, 2 and 3 paragraph variables), separated by a single near-invisible fixed
  character on its own line ("·", or a small emoji if Meta's review refuses it). The
  number of paragraphs the Owner wrote picks the template, so the WhatsApp reads as typed.
- **400 characters of what the Owner typed.** Message Fields count nothing, and the Wrapper
  is left out. (Amended 2026-11-14: first counted with the fields filled in against the
  Event's longest Guest name.) The count is simpler to explain, and the ceiling still
  holds without a guard: the longest Wrapper is 52 characters, which leaves about 570 of
  Meta's 1,024 for field values. Every field placed once at the longest value in
  production (venue and Guest name 48 each) adds about 230, so only a field repeated a
  dozen times could reach the cap.
- **A draft survives switching.** An Owner who goes back to the Kululu Wording keeps their
  text. Only the chosen message is sent.
- **Same attachment and buttons as the Kululu Wording.** Choosing a Personal Message changes
  only the words. Its text belongs to one Schedule, and two Follow-ups have two texts.
- **The SMS mirrors the WhatsApp**, for the Kululu Wording too: the same words and Wrapper,
  with real line breaks, and each button replaced by a link line. No SMS text is written
  separately any more. An Ask's attachment adds no link: the page the RSVP link opens
  shows the image or the video above the answer buttons.

## Considered Options

- **Pre-fill the editor with the Kululu Wording.** Rejected by the Owner in favour of a
  blank page.
- **The Wrapper carries the date and venue**, as today's frame does. Rejected: it is not
  the minimal wrapper, and it speaks for the Owner.
- **Warn or block on a missing date or venue.** Rejected: the guest page behind the buttons
  has every detail, and the message is the Owner's call.
- **A single paragraph, or ` | ` for line breaks.** Rejected: the WhatsApp would not read
  as the Owner wrote it.
- **Hold the send when a field is empty at send time**, like a missing Occasion Phrase.
  Rejected in favour of checking at save time only.

## Consequences

- **Template count.** 15 Kululu Wording templates (Invitation 3 headers, Follow-up 2,
  Reminder 2 days × table × gift = 8, Thank You 2) and 27 Personal Message templates
  (Invitation 9, Follow-up 6, Reminder 6, Thank You 6), so 42 new Meta templates. Every
  Personal Message template is Marketing (ADR 0046).
- **Longer SMS.** A 400-character Hebrew Personal Message is about six SMS segments per
  fallback, and Kululu pays for it.
- A text containing what Meta reads as template syntax (`{{`), tabs or runs of spaces has to
  be cleaned before sending, or Meta rejects it.
- The separator character is the one part not yet proven: it is settled at Meta review,
  before the messages are written into the code (ADR 0055).
