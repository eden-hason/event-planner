# Message Plan and Personal Message - Design Brief

**For:** Claude Design
**Date:** 2026-11-07
**Product:** Kululu - event guest management for the Israeli market
**Claude Design project:** `20592c22-ce05-4935-8eff-a8bf3abd9f18` (the same project as
`Schedules Hero.dc.html`, `Schedule Results.dc.html` and the schedules list redesign -
build on those, do not restart the page's look)

Vocabulary is binding and defined in [`CONTEXT.md`](../../CONTEXT.md), in particular
**Schedule Type**, **Ask**, **Kululu Wording**, **Personal Message**, **Wrapper**,
**Message Field**, **Occasion Phrase**, **Rendition** and **SMS Fallback**. Two decisions
are binding here:

- [ADR 0053](../adr/0053-the-plan-is-invitation-follow-ups-reminder-thank-you.md) - the
  plan's shape: an Invitation that asks, two Follow-ups, one Event Reminder, a Thank You
- [ADR 0054](../adr/0054-a-personal-message-is-the-owners-whole-message.md) - the
  Personal Message is the Owner's whole message, written from a blank page

If something below seems to contradict them, the ADR wins. Say so in your notes rather
than designing around it.

---

## 1. What we are designing

The Owner's message plan for a new Event, end to end: what the schedules page shows, what
each Schedule's settings are, and above all the **Personal Message editor**, where the
Owner writes their own message and drops in the Event's facts.

1. **The schedules list** for the new plan (section 5) - five rows instead of today's mix
2. **The Schedule detail**, per stage (section 6) - message choice, attachment, buttons,
   gift switch, timing
3. **The Personal Message editor** (section 7) - the centerpiece of this brief
4. **The message preview** (section 8) - WhatsApp and SMS, per guest

Only Events on the current **Message Plan** get this model: at first Events an Operator
moves onto it, later every new Event. Events on the Classic Message Plan keep today's
screens (Variants, the "personal note", the paragraph-in-a-frame Personal Message, the
Advance Reminder) until they end. Do not design the old screens, and do not design an
Owner-side switch between the two. The only switch is an Operator's, in the Back Office:
a confirmation dialog that says the Event's plan starts over (chosen dates and wording are
not carried, an Extra Schedule must be granted again) and that it cannot be undone.

## 2. Who this is for

The Owner, planning their own wedding, henna or bar/bat mitzva, on a phone, in Hebrew,
RTL. Design in Hebrew first. Desktop matters too, because many Owners write long text at a
computer (section 9).

This is the screen where the Owner says something in their own voice to everyone they
love. It should feel like writing a card, not filling in a form. The Event's facts should
feel like something the Owner *places* in their sentence, not fields they are made to fill.

## 3. The thesis

**Write it once, in your words, and Kululu fills in the facts.**

Every stage has Kululu's text ready to send. An Owner who does nothing sends that. An Owner
who wants their own words gets a blank page, a palette of the Event's facts and the guest's
name, and a preview that shows exactly what each guest will get, on WhatsApp and by SMS.
Whatever they write, the attachment and the buttons stay the same.

## 4. What changes from today

| Today | New model |
|---|---|
| Initial Invitation (no buttons) + Confirmation rounds | **Invitation** (asks, with RSVP buttons) + **Follow-ups** |
| Variants (tones) picker, shown as "ברירת מחדל" | One **Kululu Wording** per stage, no picker |
| Personal Message = one paragraph inside a frame with date and venue; Enter shown as `\|` | Personal Message = **the whole message**, with **real paragraphs** (up to 3) and **Message Fields** |
| 300 characters | **400 characters**, counted with the fields filled in |
| Advance Reminder as a separate row an Operator adds | One **Event Reminder** that can move to any day; its wording follows the day |
| Gift button decided on the Gifting page for the whole Event | A **gift switch on each** Reminder and Thank You |
| Separate "personal note" card under Kululu's text | Gone on new Events |
| Video invitation only as an Operator's one-off | **Video** is a normal Invitation attachment |

## 5. The schedules list

A new Event's plan is always these five Schedules, in this order (plus Call Rounds on the
calls Plan, unchanged):

| Row | Schedule Type | Who gets it | When |
|---|---|---|---|
| 1 | הזמנה (Invitation) | All guests | Undated - the Owner picks |
| 2 | תזכורת לאישור הגעה (Follow-up) | Guests who have not answered | Undated |
| 3 | תזכורת לאישור הגעה (Follow-up) | Guests who have not answered | Undated |
| 4 | תזכורת לאירוע (Event Reminder) | Confirmed guests | Proposed: Event day 10:00, or the day before at 10:00 for a morning Event |
| 5 | תודה (Thank You) | Confirmed guests | The day after the Event, at 10:00 |

The Hebrew labels are proposals. "תזכורת לאישור הגעה" for the Follow-up is a placeholder:
it must not be confused with the Event Reminder, so find a better label if you can, and
show your options. The two Follow-ups are told apart as 1 and 2.

Each row should say whether it sends **Kululu's text** or **the Owner's own message**, at
a glance, without opening it. That is the one new piece of information in the list.

## 6. The Schedule detail

The cards, in order. Keep today's card language (`SettingsCard`) and the page's single
Save bar. Nothing on this page saves by itself.

### 6.1 Message - Kululu's text or your own

Two choices, as today's radio card (`סוג ההודעה`):

- **נוסח של Kululu** (Kululu Wording) - selected by default
- **הודעה אישית** (Personal Message) - opens the editor (section 7)

Rename the current "ברירת מחדל" label: it describes the system, not the message. The
description under each choice should say what stays the same: "the attachment and buttons
are the same either way".

An Owner who switches back to Kululu's text keeps their draft. Switching to Personal
Message again brings it back. Only the chosen one is sent. An empty Personal Message
counts as no Personal Message, so the Schedule sends Kululu's text, and the UI should make
that obvious rather than let an empty editor look like a choice.

### 6.2 Attachment (Invitation and Follow-ups only)

The Event has one invitation image and optionally one video, uploaded once and shared by
every Schedule. Each Ask chooses what to attach:

- **Invitation:** image / video / nothing
- **Follow-up:** image / nothing (never the video)

Defaults: the image if one is uploaded, otherwise nothing. If there is no image, or no
video, the option is shown but disabled, with a way to upload one. The video rules are
today's (`invitationVideo` card: MP4, up to 16MB). Reuse that card's upload states.

The Reminder and the Thank You have no attachment.

### 6.3 Buttons - shown, not edited

The buttons are fixed per stage and identical for both kinds of message. Show them as a
read-only description, so the Owner knows they don't have to write them:

| Stage | Buttons |
|---|---|
| Invitation, Follow-ups | `נגיע בשמחה` · `לא נוכל להגיע` (quick replies) |
| Event Reminder | `ניווט לאירוע` · `שליחת מתנה` (gift only if switched on) |
| Thank You | `שליחת מתנה` (only if switched on) |

### 6.4 Gift switch (Event Reminder and Thank You)

One switch per Schedule: "כפתור מתנה". It is on by default when the Event's Gifting page is
set up. If it isn't set up, the switch is disabled with a link to set it up. Turning it on
for the Thank You but off for the morning Reminder is the expected case. Design for it.

### 6.5 Timing, per stage

- **Invitation, Follow-ups:** today's undated date-and-hour picker, unchanged.
- **Event Reminder:** any day from today up to and including the Event day, plus an hour.
  The wording follows the day, so the picker should *say* which wording it will be:
  "on the Event day the message says 'today'", "on an earlier day the message names the
  day". The preview (section 8) switches with it. Kululu proposes Friday instead of
  Saturday, but the Owner may still pick Saturday.
- **Thank You:** the day is fixed and shown as text, never as a control. Only the hour
  moves. When the day after the Event is Saturday, it is Sunday instead. Show why in one
  line ("Saturday becomes Sunday"), because the Owner of a Friday Event will wonder.

### 6.6 Audience

Read-only, one line, as today's `TargetAudienceCard`: all guests / guests who have not
answered / confirmed guests.

## 7. The Personal Message editor

The heart of the brief. Design it in the most detail.

### 7.1 The Wrapper, around the editor

Kululu adds one fixed line before the Owner's text and one after it. They cannot be edited
or removed, because WhatsApp requires them. Show them **above and below the writing area**,
visibly part of the message but clearly not the Owner's, so the Owner writes "inside" them.
Provisional lines (final wording comes with the Meta submission):

| Stage | Opening line | Closing line |
|---|---|---|
| Invitation | הזמנה לאירוע 💌 | נשמח לדעת אם תגיעו 👇 |
| Follow-up | עדיין מחכים לתשובה 💌 | נשמח לדעת אם תגיעו 👇 |
| Event Reminder | תזכורת לאירוע 🎉 | לניווט לאירוע 👇 |
| Thank You | תודה מכל הלב ❤️ | ❤️ (or לשליחת מתנה 👇 when the gift switch is on) |

The Reminder's lines read the same on any day.

### 7.2 Writing

- **Starts blank.** No prefilled text. The placeholder should be inspiring, not
  instructive: a line of the kind of thing Owners say.
- **Paragraphs:** Enter starts a new paragraph, and **at most three**. The guest sees real
  paragraph breaks. A fourth Enter does nothing, and the UI says why in one short line
  once the third paragraph exists. A single line break inside a paragraph isn't possible
  either: Enter always means "new paragraph". Make that feel natural, not like a bug.
- **Empty paragraphs** (two Enters in a row) collapse. The guest never sees a gap.
- **400 characters**, counted with the Message Fields filled in for the guest shown in the
  preview, not counting the Wrapper. Show the count where it doesn't nag until it is close.
  A guest with a long name can make one guest's message longer than another's, so the limit
  is checked against the longest guest name. Say so if the count changes as the preview
  guest changes.
- **No content rules.** Links, phone numbers and emoji are all allowed. Kululu does not
  check that the date or venue is mentioned, and the UI must not hint that it should.

### 7.3 Message Fields

A palette of facts the Owner places in their text. Each one becomes an inline token in the
writing area that reads like the value it stands for, not like code (no `{{ }}`, no
English keys). Placing one is the main interaction to design. Consider tapping a field to
insert it at the cursor, and how it works on a phone keyboard, where the palette must stay
reachable while typing.

| Field | Sample value | Offered on |
|---|---|---|
| שמות המארחים (hosts) | נועה ודורון | every stage |
| שם האירוע (Occasion Phrase) | החתונה של נועה ודורון | every stage |
| תאריך (date, weekday + date) | יום חמישי, 12 בנובמבר | every stage |
| מקום (venue name) | אולמי הגן | every stage |
| קבלת פנים (reception time) | 19:30 | every stage |
| חופה / טקס (ceremony time) | 20:30 | every stage, when the Event has one |
| שם האורח (Guest's name) | דנה לוי | every stage |
| שולחן (Guest's table) | 12 | Event Reminder only, in a table sentence (7.4) |

- **The Guest's name** is the name exactly as in the guest list. Some are messy
  ("משפחת כהן", "דוד מהעבודה"). The preview is where the Owner finds out (section 8).
- **A field with no value right now** (no ceremony time) can be placed, but the
  message can't be saved while it's empty. Show that on the token itself and in the Save
  bar's error, with a way to fill the value in (a link to the Event details) or remove the
  token. A value that is cleared after saving is simply sent empty. That's the Owner's
  call, and there is no warning for it.

### 7.4 The table sentence (Event Reminder only)

Not every guest has a table. The table field can only go inside a sentence the Owner
marks as **the table sentence**, for example "השולחן שלכם: 12". Guests with no table get
the message without that sentence. Design:

- how the Owner makes a sentence the table sentence (it might be the act of inserting the
  table field itself)
- how that sentence looks different in the editor
- how the preview shows both cases (section 8)

There is at most one table sentence per message.

### 7.5 States of the editor

- **Empty** (sends Kululu's text)
- **Writing** (with fields placed)
- **Field without a value** (blocks Save)
- **At the paragraph limit**
- **Near / at the character limit**
- **Read-only:** the Schedule has been sent, or the Event can't send yet (today's lock
  rules and `ScheduleLockedNotice`)

## 8. The preview

Today's `MessagePreview` grows into the place where the Owner checks *every* guest's
message. It shows exactly what is sent:

- **WhatsApp:** the attachment header (image, video poster or none), the Wrapper, the
  message with the fields filled in, and the buttons.
- **SMS:** the same words and Wrapper, with real line breaks, and each button turned into a
  link line, as today's SMS does:
  - Invitation / Follow-up: `לאישור הגעה: kulu-lu.com/...`
  - Reminder: `לניווט ולפרטים נוספים: ...` (and the gift link when switched on)
  - Thank You: `לשליחת מתנה: ...` when switched on

  SMS is what a guest gets when WhatsApp fails. It's secondary, so a tab or a toggle, not a
  second phone side by side.
- **Guest picker:** a way to see the message as a specific guest: their name filled in and,
  on the Reminder, with or without a table. The Owner should find messy names here.
  Defaults to a seated guest with a typical name.
- **Reminder day:** the Kululu Wording preview changes with the Reminder's day ("today" vs
  the named day). A Personal Message doesn't change.
- The preview applies to **both** kinds of message. For Kululu's text it's the only way the
  Owner reads it, since the Owner never edits it.

The Test Message (send to my own phone) stays where it is today and sends what this preview
shows.

### Provisional Kululu Wording for the previews

Final text is written with the Meta submission. Use these so the artboards read right:

**Invitation**
```
הוזמנתם לחתונה של נועה ודורון 💌

📅 יום חמישי, 12 בנובמבר 2026
📍 אולמי הגן, ראשון לציון

נשמח לדעת אם תגיעו
[נגיע בשמחה] [לא נוכל להגיע]
```

**Follow-up**
```
עדיין לא קיבלנו את תשובתכם לחתונה של נועה ודורון

📅 יום חמישי, 12 בנובמבר 2026
📍 אולמי הגן, ראשון לציון

נשמח לדעת אם תגיעו
[נגיע בשמחה] [לא נוכל להגיע]
```

**Event Reminder, on the Event day** (on an earlier day the second line reads
"החתונה של נועה ודורון ביום חמישי, 12 בנובמבר")
```
תזכורת 🎉
החתונה של נועה ודורון מתקיימת היום

📍 אולמי הגן, ראשון לציון
🕐 קבלת פנים - 19:30
🪑 מספר השולחן שלכם: 12

מחכים לראותכם
[ניווט לאירוע] [שליחת מתנה]
```

**Thank You**
```
תודה ענקית 🙏🏼
שמחנו מאוד שהגעתם לחתונה של נועה ודורון וחגגתם איתנו

אוהבים ומעריכים ❤️
[שליחת מתנה]
```

## 9. Mobile and desktop

- **Mobile first.** The editor and its field palette while the keyboard is open is the
  hardest screen in the brief. Show it explicitly. The preview is a step away (a tab or a
  sheet), not squeezed beside the editor.
- **Desktop:** editor and preview side by side, so the preview updates as the Owner types.
  The schedules page's existing desktop layout (list + detail pane) stays.

## 10. Copy rules

- No em dashes anywhere: a plain hyphen (`-`).
- No trailing period on single-line UI text (labels, buttons, toasts, errors, helper lines).
- Speak to the Owner in plural Hebrew (כתבו, בחרו), as today's schedules copy does.
- Never "template", "variable" or "placeholder" in Owner-facing copy. These are
  "הנוסח של Kululu", "ההודעה האישית שלכם" and "פרטי האירוע".

## 11. Out of scope

- Older Events and their screens (Variants, personal note, Advance Reminder, the framed
  Personal Message)
- Moving an existing Event onto the new model (backlog 0038)
- Back Office screens
- Adding or removing Follow-ups (today's rules stand)
- Call Rounds, Owner Messages, the Results tab
- The final Hebrew of Kululu Wording and the Wrappers (provisional above)

## 12. Deliverables

Mobile (390pt) and desktop artboards for:

1. The schedules list for a new Event: undated Asks, dated Reminder and Thank You, one row
   on a Personal Message
2. Invitation detail with Kululu's text: attachment set to image, preview open
3. Invitation detail with the Personal Message editor: blank, then written with fields,
   then a field without a value blocking Save
4. The editor on mobile with the keyboard open and the field palette in reach
5. Event Reminder detail: Personal Message with a table sentence, preview toggled between a
   seated and an unseated guest, gift switch off
6. Event Reminder timing: Event day vs an earlier day, with the preview's wording changing
7. Thank You detail: fixed day shown with the "Saturday becomes Sunday" line, hour picker,
   gift switch on
8. The preview's SMS view for an Invitation with a Personal Message
9. Read-only states: sent, and locked (Event can't send yet)

In your notes, say how each new component maps onto today's components in
`src/features/schedules/components/` (`MessageTypeCard`, `PersonalMessageCard`,
`InvitationVideoCard`, `MessagePreview`, `TargetAudienceCard`, `ScheduleDetailsCard`),
and which ones are new.
