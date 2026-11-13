# Message Plan - build plan

Date: 2026-11-12
Status: plan, nothing built

What is being built and why is in the decisions, not here:

- [ADR 0053](adr/0053-the-plan-is-invitation-follow-ups-reminder-thank-you.md) - the plan's
  shape, which Events get it, the Operator move, the rollout
- [ADR 0054](adr/0054-a-personal-message-is-the-owners-whole-message.md) - the Personal
  Message
- [ADR 0055](adr/0055-the-message-plans-messages-are-written-in-code.md) - same tables, new
  Schedule Types, messages in code
- [`CONTEXT.md`](../CONTEXT.md) - **Message Plan**, **Ask**, **Kululu Wording**,
  **Personal Message**, **Wrapper**, **Message Field**
- [design brief](design/message-plan-brief.md) - the Owner's screens
- backlog [0038](backlog/0038-an-existing-event-cannot-move-to-the-new-plan.md) and
  [0039](backlog/0039-no-catch-up-send-on-the-current-message-plan.md) - what is left out

This file is the order of work. If it disagrees with an ADR, the ADR wins.

## The seam that makes this possible

The Dispatcher and the Worker meet at a rendered `SendPayload`
(`src/features/schedules/utils/send-payload.ts`, ADR 0013). The Worker, Delivery Attempts,
webhooks, SMS polling and Results know nothing about templates. So the current Message Plan
needs **one new renderer** that produces the same `SendPayload`, and a branch at each place
that today reads a Schedule Type key or `template_id`. Nothing downstream of the payload
changes.

`schedules.template_id` and `message_deliveries.template_id` are already nullable, so a
Schedule and a Delivery on the current plan simply have none.

## Phase 0 - Meta, started first because it is the long wait

1. Submit a **probe** of three Personal Message templates (1, 2 and 3 paragraph variables)
   for one stage, to settle the separator line ("·", or a small emoji). The editor and the
   template names depend on the answer.
2. Write the final Hebrew for the five Kululu Wordings and four Wrappers.
3. Once the probe passes, submit the rest. Target count from ADR 0054: 15 Kululu Wording +
   27 Personal Message = 42. Categories as ADR 0053: Utility for the Asks and the Reminder,
   Marketing for the Thank You and every Personal Message.

Submission is done by a script that reads the code definitions of phase 2, so what Meta
holds and what the code sends cannot drift. Whether the `WHATSAPP_ACCESS_TOKEN` system user
may *create* templates (it can read them) is unverified; if not, the script prints the
payloads for pasting into the Meta UI.

## Phase 1 - database

One migration, `YYYYMMDD000000_message_plan.sql`. Check `origin/main` and open PRs for the
version first.

- `events.message_plan`: enum `classic | current`, not null, default `classic`.
- A setting for "new Events start on": `classic` until the switch. Look for an existing
  settings table before adding one; a new table needs its Visitor decision.
- `schedule_types`: add `invitation` and `follow_up` (message types, so
  `schedule_type_is_message` is true for both).
- `schedules`, new columns used only on the current plan:
  - `wording`: `kululu | personal`, default `kululu`
  - `personal_text`: the Owner's draft, kept when they switch back (paragraphs and Message
    Field tokens in one text; format fixed in phase 2), with a raw length check
  - `attachment`: `image | video | none`, null on the Reminder and Thank You
  - `gift_button`: boolean, null on the Asks
- `seed_event_default_schedules`: branch on the Event's Message Plan. The current plan
  seeds five rows without `event_type_default_schedules`: Invitation (all, undated),
  Follow-up x2 (pending, undated), Event Reminder (confirmed, proposed), Thank You
  (confirmed, pinned). Call schedules are seeded as today.
  - Reminder proposal: Event day 10:00; the day before at 10:00 when the Event starts
    before 14:00; a proposed day that is Saturday becomes Friday.
  - Thank You: the day after at 10:00; Saturday becomes Sunday.
  - Both rules are mirrored in TypeScript for the date picker, with a unit test that pins
    the same cases on each side.
- A new Event reads the setting when it is created and keeps that plan.
- `admin_move_event_to_message_plan(p_event_id)`, service role only, one transaction:
  refuses if any message Schedule of the Event was sent, expired or has a Delivery;
  deletes the unsent message Schedules; sets `message_plan = 'current'`; reseeds. Call
  schedules and Call Rounds are untouched. Extra Schedule Entitlements are not turned into
  Schedules.
- Closing guard: no Event on `classic` holds an `invitation` or `follow_up` Schedule, and
  none on `current` holds `initial_invitation`, `confirmation` or `advance_reminder`. The
  same rule as a trigger on `schedules`.

Built beyond this list, and kept: a new Event's plan is always taken from the setting and
an Event cannot move back to Classic; the `schedules` trigger also fills the new columns'
defaults and keeps each to its Schedule Types; the move also refuses once a Schedule was
dispatched or a Guest interacted; and the seed defaults an Ask to the image when the Event
has one and the gift button to on when Gifting is set up (design brief).

Verify with `npx supabase db reset`. Push only with `npm run db:push` from `main` after
merge.

## Phase 2 - the messages, in code

New folder `src/features/schedules/message-plan/`, pure and I/O-free, so all of it is unit
tested.

- `stages/{invitation,follow-up,event-reminder,thank-you}.ts`: the Kululu Wording (with
  Message Fields), the Wrapper, the buttons, and a table from **shape** to Meta template
  name. A shape is: stage, wording, attachment (Asks), same-day or earlier (Reminder),
  table line (Reminder, per Guest), gift button, paragraph count (Personal Message).
- `fields.ts`: the Message Fields and how each is filled from the Event and the Guest.
- `personal-text.ts`: parse the stored text into paragraphs and tokens; collapse empty
  paragraphs; cap at three; drop the table sentence for a Guest with no table; clean `{{`,
  tabs and runs of spaces; count 400 characters with fields filled against the Event's
  longest Guest name; refuse to save a field that is empty now.
- `render.ts`: `(schedule, event, guest, links) -> SendPayload` for WhatsApp, and the SMS
  body **derived from the same text** with real line breaks and one link line per button.
  Also a plain-text form for the preview and Hand Delivery.
- `meta-templates.ts`: every Meta template the definitions imply, as the Graph API create
  payload. Used by the phase 0 script, and by a test that fails when a shape has no
  template.

## Phase 3 - sending and everything that reads a Schedule Type

- `renderScheduleDeliveries` (`services/render-deliveries.ts`): branch on the Event's
  Message Plan to a new `renderMessagePlanDeliveries`. Audience, Record Package filter,
  Delivery reservation and RSVP tokens are reused as they are.
- SMS Fallback (`services/send-sms-fallback.ts`, `sweep-sms-fallback.ts`): today it finds
  the SMS sibling in the catalog. On the current plan it renders the SMS from phase 2.
- An `isAsk(scheduleTypeKey)` helper, and a pass over every reader of
  `initial_invitation` / `confirmation` / `advance_reminder` so each handles the new types.
  Known readers: `schedules/utils` (audience, timeline, hero, outstanding-plan, ask-plan,
  due-time-guards, confirmation-round), `schedules/services` (confirmation-round, guest
  journeys), `owner-messages`, `home/queries`, `guests/components`, `gifting/components`,
  and `admin` (utils, queries, actions, components).
- Confirmation Conversation: starts from a quick reply on an Invitation or a Follow-up.
  The follow-up copy comes from the type, not from plan order.
- Due Time rules: Reminder on any day up to and including the Event day; Thank You day
  fixed, hour only; Asks as today.
- RSVP page (`/c/<token>`): shows what the Delivery's Schedule attached, image or video,
  above the answer buttons.
- Results tab, Schedules hero, Featured Action and the No Ask Planned Signal: keyed on
  "is an Ask".
- Test Message: the earliest unsent Ask, rendered by phase 2.
- Hand Delivery: text from the plain-text renderer.
- Extra Schedule: grants one more Follow-up.
- Catch-up Send: not offered on the current plan (backlog 0039). Make sure the offer is
  hidden, not broken.

## Phase 4 - the Owner's screens

Built from the Claude Design output for the brief. On an Event on the current plan the
schedules page shows:

- the list: five rows, each saying Kululu's text or the Owner's own
- the detail: message choice, attachment (Asks), buttons shown read-only, gift switch
  (Reminder, Thank You), timing per stage, audience
- the Personal Message editor: Wrapper lines around the writing area, Message Field
  tokens, up to three paragraphs, the character count
- the preview: WhatsApp and SMS, per Guest, from the phase 2 renderer

The Classic screens are left alone. The page picks its tree from the Event's Message Plan.
The single Save bar and the unsaved-changes guard are reused.

## Phase 5 - Back Office

- Event page: which Message Plan the Event is on.
- "Move to the Message Plan" action and dialog. It lists what is lost (Due Times, Variants,
  notes, Personal Message text, any Extra Schedule to grant again) and is disabled with the
  reason once anything was sent.
- On the current plan, hide: convert Invitation to Confirmation, add Advance Reminder,
  Bespoke binding. Due Time edit, send-now and Hand Delivery stay.
- The "new Events start on" switch, for Operators only.

## Phase 6 - pilot, then the switch

1. Merge, deploy, `npm run db:push`. New Events are still Classic.
2. Move a test Event. Send every stage to real phones, both wordings, with image, video and
   no attachment, with and without table and gift, and force one SMS Fallback.
3. Move a few real Events whose Owners agree. Watch Results and failures.
4. When every Meta template is approved and the pilot is clean, flip the switch.

## Suggested pull requests

| PR | Holds | Visible to users |
|---|---|---|
| 1 | Docs: ADRs, glossary, backlog, this plan | no |
| 2 | Phase 2 (pure code + tests) and the Meta script | no |
| 3 | Phase 1 migration + phase 3 send path | no (no Event is on the plan) |
| 4 | Phase 4 Owner screens | no |
| 5 | Phase 5 Back Office move and switch | Operators only |

PR 3 and PR 4 can be worked on in parallel after PR 2: one touches services and SQL, the
other components.

## Open

- The separator line, settled by the probe.
- Final Hebrew for the Kululu Wordings and Wrappers.
- Whether the system user can create Meta templates by API.
- The Hebrew label for the Follow-up (the brief asks Design for options).
- Language: Hebrew only is assumed for the first build. Not discussed.
- The design itself: the brief is written, the screens are not designed yet.
