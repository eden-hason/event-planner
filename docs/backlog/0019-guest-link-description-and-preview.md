# The guest drawer's invitation link is unexplained, and its Preview button was removed

Status: open

## The problem

The guest drawer (`InvitationLink` in `src/features/guests/components/guest-drawer.tsx`) shows
one row for a Guest Record's link: an icon, the label **Personal invitation link** /
**הקישור האישי להזמנה** (`guests.list.drawer.link`), and a **Copy** button. Nothing on the row
says what the link is, who it is for, or what happens when someone opens it.

The row used to have a **Preview** button as well (`guests.list.drawer.preview`, an `<a>` to
`/c/${token}` in a new tab). It was removed on 2026-10-13, along with the Home Featured Action
that shared the event-level preview link (`preview` in `src/features/home/utils/featured-actions.ts`).
Both were taken out rather than fixed. This item is about bringing the drawer's Preview back
once the row explains itself.

## What is known

- **The drawer link is the Guest's real RSVP page, not a preview.** `/c/[token]` with a Guest's
  invitation token renders `ConfirmationPage` for that Guest, and any answer given there is
  recorded as that Guest's RSVP. An Owner who clicked Preview and then tried the buttons would
  have changed a real Guest's status. Nothing on the page or the button warned about this.
- **The event preview is gone.** `events.preview_token` used to open the RSVP page with a
  sample guest (at `/p/[token]` and `/c/[token]`), with a `preview` flag on
  `ConfirmationExperience` that kept answers from being recorded. Issue #491 removed it on
  2026-10-14: an Owner is not to see the guest-facing RSVP page, so `/p/` was deleted and a
  preview token now shows the invalid-link page. Restoring a Preview button would go against
  that decision.
- **Copy sends the link with a prefix.** It copies `guests.sheet.copyInvitationLinkPrefix` ("We
  would be delighted if you could kindly confirm...") followed by the URL, so the copy is meant
  for the Guest, not for the Owner. The label does not say so.
- A Visitor (ADR 0028) is gated by `requireSaved('share')` before Copy. The old Preview button
  had no gate.

## Open questions

- What should the description say? It needs to cover that this is the Guest's own RSVP link,
  that Copy produces a ready-to-send message, and that answers given on the page count as the
  Guest's.
- Should Preview come back at all? Issue #491 asked that Owners not see the guest-facing RSVP
  page, which rules out both the Guest's page and the old event preview.
- Does a Visitor need the save gate for Preview too, or only for Copy?

## Done means

The drawer row has a description an Owner can understand without asking, and a Preview button
that lets the Owner see the page without being able to change a Guest's RSVP by accident.
