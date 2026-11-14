# The Follow-ups cannot have a different image from the Invitation

Status: open

## Problem

On the current Message Plan a Follow-up attaches the Event's one image
(`events.invitations.image_url`) or nothing. Beside a video or text-only Invitation the
Event details page's "מדיה להודעות" card lets the Owner choose Image / Text only for the
Follow-ups and upload that image (2026-11-14), so a video Invitation no longer leaves them
text only. What is still missing is a *different* image: beside an image Invitation the
Follow-ups can only reuse the same picture. The design ("Kululu - פרטי האירוע עם מדיה
להודעות") offers, when "להשתמש באותה תמונה מההזמנה" is off, an upload "העלאת תמונה
לתזכורות" shared by every Follow-up. Today unchecking it means text only.

The image uploaded beside a video Invitation is the Event's image, so it also shows where
the invitation image shows (the RSVP page, Home). A separate slot would fix that too.

It was deferred on 2026-11-14 because it lands in the middle of the phase 6 pilot and
touches the send path.

## What is known

- The choice is stored per Schedule (`schedules.attachment`, `image` | `video` | `none`)
  and the Event details page writes the Invitation's and every open Follow-up's at once
  (`updateMessageMedia`, `followUpAttachment` in `src/features/schedules/utils/message-media.ts`).
  `followUpAttachment` no longer depends on the Invitation's choice.
- There is one image per Event: `events.invitations.image_url`. The renderer reads it in
  `attachmentLink` (`src/features/schedules/message-plan/render.ts`); `effectiveAttachment`
  drops a choice whose file is missing.
- Meta needs nothing new: `follow_up_kululu_image` and `follow_up_personal_image_p1..3` take
  any image URL as their header.

## What done would mean

- A place for the second image (an `invitations.follow_up_image_url` key, or a column) and a
  way to choose it per Follow-up (`attachment` gains a value, or a flag), with the seed and
  `enforce_schedule_message_plan` updated in one migration and a Visitor check unchanged.
- `attachmentLink` / `effectiveAttachment` pick it for a Follow-up; the RSVP page shows it
  on a Follow-up link; Test Message and Hand Delivery follow.
- The Event details card shows the upload when the checkbox is off.
