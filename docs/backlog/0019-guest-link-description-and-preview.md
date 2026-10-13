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
- **The event has a real preview.** `events.preview_token` resolves through
  `getConfirmationPreviewData` (`src/features/confirmation/queries/index.ts`) to a sample guest,
  and `ConfirmationExperience` takes a `preview` flag that keeps answers from being recorded.
  `/p/[token]` re-exports the `/c/[token]` page, so it reads as a preview and is noindex.
- **Copy sends the link with a prefix.** It copies `guests.sheet.copyInvitationLinkPrefix` ("We
  would be delighted if you could kindly confirm...") followed by the URL, so the copy is meant
  for the Guest, not for the Owner. The label does not say so.
- A Visitor (ADR 0028) is gated by `requireSaved('share')` before Copy. The old Preview button
  had no gate.

## Open questions

- What should the description say? It needs to cover that this is the Guest's own RSVP link,
  that Copy produces a ready-to-send message, and that answers given on the page count as the
  Guest's.
- Should the restored Preview open the Guest's page (it shows their name and party size) or
  the event preview at `/p/${preview_token}` (which cannot record anything)? If it opens the
  Guest's page, it needs a read-only mode or a clear warning. One option is a guest-scoped
  preview flag that renders the Guest's name but disables submission.
- Does a Visitor need the save gate for Preview too, or only for Copy?

## Done means

The drawer row has a description an Owner can understand without asking, and a Preview button
that lets the Owner see the page without being able to change a Guest's RSVP by accident.
