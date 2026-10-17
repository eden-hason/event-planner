# Nobody reads what an Owner writes back to the Kululu WhatsApp number

Status: open
Area: owner messages / back office
Related: `docs/adr/0039-owner-messages-are-not-schedules.md`, `docs/adr/0017-a-confirmation-conversation-is-not-sent-through-the-queue.md`

## The problem

Once Kululu sends **Owner Messages** (ADR 0039), Owners will reply to them: thanks,
questions, problems. Today an inbound WhatsApp is only ever handled as a Guest's RSVP
answer, through the Confirmation Conversation. A reply from an Owner who is not a Guest on
any Event is logged and dropped. So the welcome points to a separate, staffed support
number instead of saying "reply here".

## What is known about the moving parts

- Inbound messages arrive in `processWhatsAppWebhookEvent`
  (`src/features/schedules/services/process-whatsapp-webhook.ts`), are logged with a masked
  phone, and go to `handleInboundWhatsAppMessage` in the confirmation feature.
- An Owner may also be a Guest Record on their own Event (couples often add themselves).
  Their reply could then be read as an RSVP answer. Nothing distinguishes the two today.
- Replying within 24 hours of an Owner's message opens a free customer-service window on
  WhatsApp, so a staffed inbox could answer without a template.

## Open questions

1. Where do replies surface? A Back Office inbox, an email forward, or a Slack/WhatsApp
   forward to staff?
2. How is a sender recognised as an Owner: `profiles.phone_number`, or only the creator of
   an Event that was sent an Owner Message?
3. If the sender is both an Owner and a Guest, which wins? Probably: a reply to a Guest's
   RSVP buttons is RSVP, and free text within a window opened by an Owner Message is the
   Owner's.
4. Once this exists, does the welcome's support button move to "reply here"?

## Done means

An Operator sees every Owner reply within a working day, and no Owner reply is mistaken
for an RSVP.
