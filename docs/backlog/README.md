# Backlog

Work we have decided is worth doing and are deliberately not doing yet.

This is not a priority list and not a commitment. It exists so that a piece of thinking
already done - the evidence, the dead ends, the open questions - is not re-derived from
scratch the next time someone (or some agent) picks the item up.

## What belongs here

A gap we understand well enough to describe, but chose to defer. If the thing is a
decision that has been made, it belongs in `docs/adr/`. If it is a spec for work being
done now, it belongs in `docs/`. If it is a one-line "rename this variable", it belongs
in the diff, not here.

## Conventions

- One file per item, `NNNN-kebab-case.md`, numbered in creation order, same as
  `docs/adr/`.
- Every item opens with a `Status:` line: `open`, `in progress`, `done` (with a link to
  the ADR or PR that closed it), or `dropped` (with why).
- An item is written to be picked up **cold**: state the problem, the evidence with real
  numbers, what is already known about the moving parts, what is still unknown, and what
  "done" would mean. A reader should not need the conversation that produced it.
- Record what was *checked and found false* as well - a ruled-out approach is worth as
  much as the chosen one.
- When an item ships, the decision it encodes goes to `docs/adr/` and the backlog file is
  marked `done` with a link. Do not delete it; the trail is the point.
- Keep the index below in step with the files.

## Index

| # | Item | Area | Status |
|---|------|------|--------|
| [0001](0001-sms-delivery-visibility.md) | SMS delivery is invisible after the provider accepts it | schedules / outreach | in progress |
| [0002](0002-shabbat-and-chagim-send-window.md) | The Shabbat guard is a fixed weekly block, not a calendar | schedules / outreach | dropped |
| [0003](0003-general-event-type.md) | There is no event type for anything that is not a wedding, henna or mitzva | events / onboarding | open |
| [0004](0004-drop-guests-meal-choice.md) | Drop the superseded guests.meal_choice column | guests | done |
| [0005](0005-tag-outbound-whatsapp-for-status-correlation.md) | WhatsApp statuses are matched by searching, not by a tag | schedules / outreach | done |
| [0006](0006-partner-commission-on-refund.md) | A refunded Event leaves its Partner Commission standing | partners / billing | open |
| [0007](0007-send-to-guests-added-after-a-send.md) | A guest added after a Schedule went out never receives it | schedules / outreach | in progress |
| [0008](0008-changing-the-event-date-strands-the-plan.md) | Changing the Event date leaves the whole outreach plan behind | schedules / events | open |
| [0009](0009-set-schedule-sent-at-never-fires.md) | The trigger that stamps `schedules.sent_at` never fires | schedules / database | open |
| [0010](0010-no-way-to-turn-a-schedule-off.md) | There is no way to turn a Schedule off | schedules / outreach | open |
| [0011](0011-owner-cannot-reschedule-a-call-round.md) | The Owner cannot reschedule a call round | schedules / calls | open |
| [0012](0012-a-side-is-an-enum-not-a-nameable-group.md) | A Side is a fixed enum, so it cannot be renamed from the event details page | guests / events | open |
| [0013](0013-retry-media-download-failures.md) | A WhatsApp that failed on a media download is never retried | schedules / outreach | open |
| [0014](0014-due-time-edit-guards.md) | Editing a Due Time has no guard for the past or for after the Event | schedules / outreach | done |
| [0015](0015-purge-webhook-events.md) | Raw webhook payloads are kept forever, guest phone numbers included | schedules / privacy | open |
| [0016](0016-enforce-the-package-channel.md) | The channel a Record Package was bought for is not enforced | billing / outreach | open |
| [0017](0017-import-guests-from-whatsapp.md) | Guests cannot be imported from the Owner's WhatsApp contacts and groups | guests / import | in progress |
| [0018](0018-captcha-on-auth-endpoints.md) | Nothing but a per-IP rate limit protects the public auth endpoints | auth / abuse | open |
| [0019](0019-guest-link-description-and-preview.md) | The guest drawer's invitation link is unexplained, and its Preview button was removed | guests / confirmation | open |
| [0020](0020-test-message-is-whatsapp-only.md) | A Test Message can still go out as an SMS | schedules / home | done |
| [0021](0021-pre-event-owner-heads-up.md) | The Owner hears nothing from Kululu in the days before the Event | owner messages / outreach | open |
| [0022](0022-results-in-the-post-event-message.md) | The post-event Owner Message says thank you but not what Kululu did | owner messages / growth | open |
| [0023](0023-read-owner-replies.md) | Nobody reads what an Owner writes back to the Kululu WhatsApp number | owner messages / back office | open |
| [0024](0024-schedules-hero-attention-items.md) | The schedules hero leaves out three of its five attention items | schedules | open |
| [0025](0025-guests-abroad-are-whatsapp-only.md) | A Guest with a number from abroad is reached on WhatsApp alone, and nothing says so | guests / outreach | open |
| [0026](0026-the-co-planner-link-cannot-be-shut-off.md) | The Co-planner Link cannot be shut off, and a removed Owner can rejoin | collaborate / security | open |
| [0027](0027-no-sms-fallback-for-sign-in-codes.md) | A sign-in code has no SMS fallback, so a number without WhatsApp cannot sign in by phone | auth | open |
| [0028](0028-the-android-install-sheet-is-the-small-one.md) | The Android install sheet is the small one: the manifest has no description or screenshots | install-app / growth | open |
| [0029](0029-the-other-sign-in-method-opens-an-empty-account.md) | The other Sign-in Method opens an empty account instead of the Event | auth / onboarding | in progress |
| [0030](0030-back-office-row-click-opens-the-wrong-event.md) | On one phone, every row of the Back Office events list opens the same Event | back office | open |
| [0031](0031-a-test-message-that-never-arrives-still-counts.md) | A Test Message that never arrives still counts against the caps and leaves Home | schedules / home | open |
| [0032](0032-confirmation-audience-does-not-follow-plan-order.md) | A Confirmation's audience does not follow plan order | schedules / outreach | open |
