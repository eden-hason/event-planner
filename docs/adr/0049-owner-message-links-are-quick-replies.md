# Owner Message links are quick replies answered with the link

Date: 2026-10-29

## Status

Accepted. Supersedes the "links in the text, not buttons" point of ADR 0039.

## Context

ADR 0039 put the Owner Messages' links (`/app` in the Welcome, `/review` in the Post-event)
in the template body, not on URL buttons, because WhatsApp opens a button in its own in-app
browser. There the Owner is signed in to neither Kululu nor Google, so `/app` asks them to
sign in and the Google review form asks them to sign in to Google first.

In use, a link in a business template's body opens in WhatsApp's browser too. A link in a
plain session message, one Kululu sends inside the 24-hour window, opens in the phone's own
browser.

## Decision

**Each link is a quick-reply button on the template. A tap is answered with a session text
message that carries the link.**

- Welcome: "ניהול האירוע" answers with `/app`. Post-event: "להמלצה בגוגל" answers with
  `/review`. The links leave the body. The Welcome's "דברו איתנו" URL button stays: it ends
  in a WhatsApp chat, not a page, so the browser does not matter.
- **The buttons are static in Meta.** The send carries no button parameters, so it does not
  change, and the templates are edited in place under their `_1` names. A send works the
  same before and after Meta approves the edit.
- **A tap is recognised by what it quotes plus its label.** A template quick-reply tap
  quotes the template message, whose wamid is on the `owner_messages` row. The row gives the
  kind, and the label gives the button. A typed label that quotes the message counts as a
  tap too. Labels are checked before any lookup, so a Guest's RSVP tap costs nothing.
- The tap is claimed and answered through the same inbound path as a Confirmation
  Conversation (`whatsapp_inbound_messages`, `conversation:<id>` tag). It is checked first,
  so an Owner who is also a Guest on their Event is never read as an RSVP. The row records
  the Event and `owner:app` or `owner:review` as its action.

## Considered Options

- **A payload per send (`owner message id + action`).** Rejected for now: the send would
  carry button parameters that the live `_1` templates do not have, so every send would fail
  between deploy and Meta's approval, or the templates would need new names. The quoted
  wamid already names the row.
- **Keep the links in the body.** Rejected: that is the problem.

## Consequences

- A label is matched exactly. Changing a button's text in Meta without changing
  `src/features/owner-messages/utils/quick-replies.ts` leaves taps unanswered.
- A tap on a message whose send answer was lost (status `unknown`, no wamid stored) is not
  recognised and goes unanswered.
- **Rollout order:** deploy the code first, then edit the templates in Meta. The other order
  leaves taps unanswered until the deploy.
- The Owner gets one extra message per tap. It is free, because the tap opened the window.
