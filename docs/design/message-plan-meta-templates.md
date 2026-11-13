# Message Plan - Meta templates

Date: 2026-11-12
Status: all 42 templates submitted. 20 approved, 22 Personal Message templates pending
Meta review as of 2026-11-13 (sections 3.1, 3.2).

The Meta WhatsApp templates behind the current **Message Plan** (ADR 0053), its **Kululu
Wording** and its **Personal Message** (ADR 0054). Phase 0 of
[`docs/message-plan-build-plan.md`](../message-plan-build-plan.md).

These are not catalog rows. Under ADR 0055 the messages live in code
(`src/features/schedules/message-plan/`, phase 2), and the phase 2 `meta-templates.ts` is
what eventually produces these payloads. Until that exists, this file is the source. When
phase 2 lands, the code wins and this file should point at it.

Language `he` for all. Graph API version `v22.0`, the version the app sends with
(`src/features/schedules/services/post-whatsapp.ts`). WABA `1288067446631547`.

## 1. Names

Pattern, so every shape has exactly one name and the full set has room:

```
{stage}_{wording}[_{header}][_{day}][_tables][_gift][_p{n}]
```

| Part | Values | Notes |
|---|---|---|
| `stage` | `invitation`, `follow_up`, `event_reminder`, `thank_you` | `thank_you` as in the existing `thank_you_1`, though the Schedule Type key is `post_event` |
| `wording` | `kululu`, `personal` | Kululu Wording or Personal Message |
| `header` | `image`, `video`, absent | Asks only. Absent means no header, as in `confirmation_1` vs `confirmation_1_image` |
| `day` | `today`, `dated` | Reminder in Kululu Wording only. The Personal Message Wrapper is the same on any day |
| `tables` | present or absent | Reminder in Kululu Wording only. A Personal Message carries the table in the Owner's own table sentence |
| `gift` | present or absent | Reminder and Thank You |
| `p{n}` | `p1`, `p2`, `p3` | Personal Message only: the number of paragraph variables |

Suffix order is fixed: header, day, tables, gift, paragraphs. No language code, no revision
suffix, no variant number (project convention since 2026-09-13: an approved template is
edited in place under the same name; only a delete forces a new name, because Meta locks a
deleted name for 30 days).

None of these names exists in the Classic catalog: Classic names are `initial_invitation*`,
`save_the_date_1*`, `confirmation_1*`, `event_reminder_*`, `thank_you_1*`,
`personal_message_*` and the older `*_casual` / `wedding_*` families. The permission check
(section 4) also lists every name on the WABA, to confirm.

## 2. The probe

Three Personal Message templates for the Invitation with no header, one per paragraph
count. They settle the one unproven point of ADR 0054: whether Meta approves a fixed,
near-invisible separator line between paragraph variables. They also test the two related
risks in section 6 (a body that is mostly variables, and two variables with only the
separator between them).

The separator sits on its own line. A blank line between the Wrapper and the Owner's text
keeps the Wrapper visibly apart from the Owner's words.

### 2.1 Rendering

`invitation_personal_p1` - MARKETING, no header

```
הזמנה לאירוע 💌

{{1}}

נשמח לדעת אם תגיעו 👇
[נגיע בשמחה] [לא נוכל להגיע]
```

`invitation_personal_p2` - MARKETING, no header

```
הזמנה לאירוע 💌

{{1}}
·
{{2}}

נשמח לדעת אם תגיעו 👇
[נגיע בשמחה] [לא נוכל להגיע]
```

`invitation_personal_p3` - MARKETING, no header

```
הזמנה לאירוע 💌

{{1}}
·
{{2}}
·
{{3}}

נשמח לדעת אם תגיעו 👇
[נגיע בשמחה] [לא נוכל להגיע]
```

| Variable | Filled with |
|---|---|
| `{{n}}` | The Owner's paragraph n, Message Fields already filled in for the Guest, one line, cleaned of `{{`, tabs and runs of spaces. Never empty: empty paragraphs collapse, and the paragraph count picks the template |

Buttons, both `QUICK_REPLY`, text exactly as `confirmation_1`, because the Confirmation
Conversation matches on them (`src/features/confirmation/utils/typed-quick-reply.ts`). The
payload of each is set per send, not at creation.

Sample values (Meta requires one per variable). They read as a real Owner would write, and
together stay under the 400-character limit (238, 237 and 336 characters):

| Template | `{{1}}` | `{{2}}` | `{{3}}` |
|---|---|---|---|
| `_p1` | דנה יקרה, אחרי שנתיים של תכנון, המון התרגשות וקצת לחץ, אנחנו מתחתנים! נשמח מאוד שתהיו איתנו ביום חמישי, 12 בנובמבר, באולמי הגן בראשון לציון. קבלת הפנים מתחילה ב-19:30 והחופה ב-20:30. יש חניה חינם ליד האולם, ומי שצריך הסעה מוזמן לכתוב לנו. | | |
| `_p2` | דנה יקרה, אחרי שנתיים של תכנון, המון התרגשות וקצת לחץ, אנחנו מתחתנים! נשמח מאוד שתהיו איתנו ביום חמישי, 12 בנובמבר, באולמי הגן בראשון לציון. | קבלת הפנים מתחילה ב-19:30 והחופה ב-20:30. יש חניה חינם ליד האולם, ומי שצריך הסעה מוזמן לכתוב לנו. | |
| `_p3` | as `_p2` | as `_p2` | בלי מתנות בבקשה, הנוכחות שלכם היא המתנה הכי גדולה. לא יכולים לחכות לראות את כולכם, רוקדים עד הבוקר! |

### 2.2 Payloads

`POST https://graph.facebook.com/v22.0/1288067446631547/message_templates`, header
`Authorization: Bearer <WHATSAPP_ACCESS_TOKEN>`, `Content-Type: application/json`.
`parameter_format` is left out, so the template is positional (`{{1}}`, `{{2}}`), Meta's
default.

`invitation_personal_p1`

```json
{
  "name": "invitation_personal_p1",
  "language": "he",
  "category": "MARKETING",
  "components": [
    {
      "type": "BODY",
      "text": "הזמנה לאירוע 💌\n\n{{1}}\n\nנשמח לדעת אם תגיעו 👇",
      "example": {
        "body_text": [
          [
            "דנה יקרה, אחרי שנתיים של תכנון, המון התרגשות וקצת לחץ, אנחנו מתחתנים! נשמח מאוד שתהיו איתנו ביום חמישי, 12 בנובמבר, באולמי הגן בראשון לציון. קבלת הפנים מתחילה ב-19:30 והחופה ב-20:30. יש חניה חינם ליד האולם, ומי שצריך הסעה מוזמן לכתוב לנו."
          ]
        ]
      }
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "QUICK_REPLY",
          "text": "נגיע בשמחה"
        },
        {
          "type": "QUICK_REPLY",
          "text": "לא נוכל להגיע"
        }
      ]
    }
  ]
}
```

`invitation_personal_p2`

```json
{
  "name": "invitation_personal_p2",
  "language": "he",
  "category": "MARKETING",
  "components": [
    {
      "type": "BODY",
      "text": "הזמנה לאירוע 💌\n\n{{1}}\n·\n{{2}}\n\nנשמח לדעת אם תגיעו 👇",
      "example": {
        "body_text": [
          [
            "דנה יקרה, אחרי שנתיים של תכנון, המון התרגשות וקצת לחץ, אנחנו מתחתנים! נשמח מאוד שתהיו איתנו ביום חמישי, 12 בנובמבר, באולמי הגן בראשון לציון.",
            "קבלת הפנים מתחילה ב-19:30 והחופה ב-20:30. יש חניה חינם ליד האולם, ומי שצריך הסעה מוזמן לכתוב לנו."
          ]
        ]
      }
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "QUICK_REPLY",
          "text": "נגיע בשמחה"
        },
        {
          "type": "QUICK_REPLY",
          "text": "לא נוכל להגיע"
        }
      ]
    }
  ]
}
```

`invitation_personal_p3`

```json
{
  "name": "invitation_personal_p3",
  "language": "he",
  "category": "MARKETING",
  "components": [
    {
      "type": "BODY",
      "text": "הזמנה לאירוע 💌\n\n{{1}}\n·\n{{2}}\n·\n{{3}}\n\nנשמח לדעת אם תגיעו 👇",
      "example": {
        "body_text": [
          [
            "דנה יקרה, אחרי שנתיים של תכנון, המון התרגשות וקצת לחץ, אנחנו מתחתנים! נשמח מאוד שתהיו איתנו ביום חמישי, 12 בנובמבר, באולמי הגן בראשון לציון.",
            "קבלת הפנים מתחילה ב-19:30 והחופה ב-20:30. יש חניה חינם ליד האולם, ומי שצריך הסעה מוזמן לכתוב לנו.",
            "בלי מתנות בבקשה, הנוכחות שלכם היא המתנה הכי גדולה. לא יכולים לחכות לראות את כולכם, רוקדים עד הבוקר!"
          ]
        ]
      }
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "QUICK_REPLY",
          "text": "נגיע בשמחה"
        },
        {
          "type": "QUICK_REPLY",
          "text": "לא נוכל להגיע"
        }
      ]
    }
  ]
}
```

### 2.3 Fallback separator

Submit only if Meta rejects the "·" line. The fallback replaces every `\n·\n` with `\n▫️\n`
(U+25AB WHITE SMALL SQUARE + U+FE0F), a small emoji that reads as a quiet mark rather than
as decoration. Nothing else changes: same names, samples, buttons and category.

Prefer editing the rejected template in place (`POST /{template-id}` with the new
`components`, or Edit in WhatsApp Manager) over deleting it, so the name stays usable.

`invitation_personal_p1` has no separator, so it has no fallback. If `_p1` itself is
rejected, the problem is not the separator (see section 6).

`invitation_personal_p2` body, fallback:

```
"text": "הזמנה לאירוע 💌\n\n{{1}}\n▫️\n{{2}}\n\nנשמח לדעת אם תגיעו 👇"
```

`invitation_personal_p3` body, fallback:

```
"text": "הזמנה לאירוע 💌\n\n{{1}}\n▫️\n{{2}}\n▫️\n{{3}}\n\nנשמח לדעת אם תגיעו 👇"
```

### 2.4 Probe status

| Template | Separator | Template id | Status | Category Meta gave | Date |
|---|---|---|---|---|---|
| `invitation_personal_p1` | none | `1639159083779029` | APPROVED | MARKETING | 2026-11-12 |
| `invitation_personal_p2` | `·` | `2147214855922535` | APPROVED | MARKETING | 2026-11-12 |
| `invitation_personal_p3` | `·` | `2583589052116072` | APPROVED | MARKETING | 2026-11-12 |

**Probe result: Meta approved all three, so the separator is `·`.** The fallback (2.3) is
not needed. Approval reported by the Owner on 2026-11-12.

Text, names and samples approved by the Owner in chat on 2026-11-12, then submitted by API
exactly as in 2.2. Read the status with
`GET /v22.0/{template-id}?fields=name,status,category,rejected_reason`.

## 3. The full set

Target from ADR 0054: 15 Kululu Wording + 27 Personal Message = **42**. The list below
gives 42, and section 3.4 reconciles it.

Fields named below are the phase 2 Message Fields. `occasionPhrase` is written without the
article so it joins a preposition ("הוזמנתם ל{{1}}" reads "הוזמנתם לחתונה של נועה ודורון").
A line whose verb must agree with the occasion is one whole-line field, as `todayLine` and
`approachingLine` are today (`src/features/schedules/services/map-event-row.ts`).

URL buttons follow `event_reminder_1`: dynamic suffix = the Event's short code.
`ניווט לאירוע` registered with base `https://kulu-lu.com/nav/`, `שליחת מתנה` with base
`https://kulu-lu.com/r/`, example suffix e.g. `ab12cd`.

Media headers (image, video) need a sample file uploaded through the Resumable Upload API
at creation (`"example": {"header_handle": ["4::..."]}`); the Event's own image or video is
sent at send time.

### 3.1 Kululu Wording - 15 templates

Decided by the Owner on 2026-11-12: the Kululu Wordings **reuse the Classic texts**, copied
word for word from the live `message_templates` rows, under **new names** (so rewording
the current plan never changes what Classic Events receive), and each goes in under the
**category Meta gave its Classic original**, so there is nothing left to recategorize. The
Follow-up adds one line, worded by the Owner. Texts are final unless marked otherwise.

| Stage | Classic source | Category (Meta's on the source) |
|---|---|---|
| Invitation | `confirmation_1` | MARKETING |
| Follow-up | `confirmation_1_follow_up`, plus one line | MARKETING |
| Reminder, Event day | `event_reminder_1` (without the note line) | UTILITY |
| Reminder, earlier day | `advance_reminder_1`, plus the buttons and the table line | UTILITY |
| Thank You | `thank_you_1` (without the note) | MARKETING |

**Invitation** - MARKETING - quick replies `נגיע בשמחה`, `לא נוכל להגיע`

```
משפחה וחברים יקרים,
הוזמנתם ל{{1}}

📅 {{2}}
📍 {{3}}

נשמח לדעת אם תגיעו 🙏🏼
```

| Var | Field | Sample |
|---|---|---|
| `{{1}}` | `occasionPhrase` | חתונה של נועה ודורון |
| `{{2}}` | `eventDate` | יום חמישי, 12 בנובמבר 2026 |
| `{{3}}` | venue name | אולמי הגן, ראשון לציון |

| Name | Header | Picked when |
|---|---|---|
| `invitation_kululu` | none | Invitation, Kululu Wording, attachment none |
| `invitation_kululu_image` | IMAGE | attachment image |
| `invitation_kululu_video` | VIDEO | attachment video (new: no Classic template has this text with a video) |

**Follow-up** - MARKETING - same quick replies

```
משפחה וחברים יקרים,
{{1}}
עדיין לא עדכנתם אם תגיעו

📅 {{2}}
📍 {{3}}

נשמח לדעת אם תגיעו 🙏🏼
```

The third line is the Owner's addition to the Classic text. Its placement (under the
opening line rather than joined to the closing line) is Kululu's choice; the Owner may move
it.

| Var | Field | Sample |
|---|---|---|
| `{{1}}` | `approachingLine` | החתונה של נועה ודורון מתקרבת |
| `{{2}}` | `eventDate` | יום חמישי, 12 בנובמבר 2026 |
| `{{3}}` | venue name | אולמי הגן, ראשון לציון |

| Name | Header | Picked when |
|---|---|---|
| `follow_up_kululu` | none | Follow-up, Kululu Wording, attachment none |
| `follow_up_kululu_image` | IMAGE | attachment image |

**Event Reminder on the Event day** - UTILITY - URL `ניווט לאירוע` always, URL
`שליחת מתנה` on `_gift`

```
תזכורת 🎉
{{1}}

📍 {{2}}
🕐 {{3}}
🪑 מספר השולחן שלכם: {{4}}

מחכים לחגוג איתכם ❤️
```

The table line is on `_tables` only.

| Var | Field | Sample |
|---|---|---|
| `{{1}}` | `todayLine` | החתונה של נועה ודורון מתקיימת היום |
| `{{2}}` | venue name | אולמי הגן, ראשון לציון |
| `{{3}}` | `receptionTime` | 19:30 |
| `{{4}}` | the Guest's table (`_tables`) | 12 |

**Event Reminder on an earlier day** - UTILITY - same buttons

```
תזכורת 🎉
{{1}}

📅 {{2}}
📍 {{3}}
🕐 {{4}}
🪑 מספר השולחן שלכם: {{5}}

מחכים לחגוג איתכם ❤️
```

The table line is on `_tables` only. `advance_reminder_1` had no buttons and no table line;
both are added here because the current plan's Reminder always navigates and may name the
table.

| Var | Field | Sample |
|---|---|---|
| `{{1}}` | `approachingLine` | החתונה של נועה ודורון מתקרבת |
| `{{2}}` | `eventDate` | יום חמישי, 12 בנובמבר 2026 |
| `{{3}}` | venue name | אולמי הגן, ראשון לציון |
| `{{4}}` | `receptionTime` | 19:30 |
| `{{5}}` | the Guest's table (`_tables`) | 12 |

| Name | Picked when |
|---|---|
| `event_reminder_kululu_today` | Due on the Event day, Guest has no table, gift off |
| `event_reminder_kululu_today_gift` | Event day, no table, gift on |
| `event_reminder_kululu_today_tables` | Event day, Guest has a table, gift off |
| `event_reminder_kululu_today_tables_gift` | Event day, table, gift on |
| `event_reminder_kululu_dated` | Due on an earlier day, no table, gift off |
| `event_reminder_kululu_dated_gift` | earlier day, no table, gift on |
| `event_reminder_kululu_dated_tables` | earlier day, table, gift off |
| `event_reminder_kululu_dated_tables_gift` | earlier day, table, gift on |

**Thank You** - MARKETING - URL `שליחת מתנה` on `_gift`

```
תודה ענקית 🙏🏼
שמחנו מאוד שהגעתם ל{{1}} וחגגתם איתנו

אוהבים ומעריכים ❤️
```

| Var | Field | Sample |
|---|---|---|
| `{{1}}` | `occasionPhrase` | חתונה של נועה ודורון |

| Name | Picked when |
|---|---|
| `thank_you_kululu` | gift off |
| `thank_you_kululu_gift` | gift on |

Ten of these bodies are identical to approved Classic templates (only the Follow-ups, the
video Invitation and the earlier-day Reminders differ). Meta may flag the copies as
duplicates; if it does, the fallback is to send the Classic template for that shape, which
the Owner weighed and set aside as the first choice (section 6).


#### Kululu Wording status

All 15 confirmed by the Owner in chat and submitted by API on 2026-11-12. Meta accepted
every one for review (no duplicate rejection at creation). Button URLs and sample formats
are copied from the approved Classic templates. The media samples are Kululu's own wedding
illustration (`public/hero-wedding-scene.webp`): a 1080px JPG for the image headers and a
5-second 720x892 H.264/AAC MP4 of it with a slow zoom for the video header, uploaded
through the Resumable Upload API of app `1607101830303923`.

| Template | Template id | Category Meta gave | Status |
|---|---|---|---|
| `event_reminder_kululu_dated` | `1450720403153936` | MARKETING | APPROVED |
| `event_reminder_kululu_dated_gift` | `1868650751244586` | UTILITY | APPROVED |
| `event_reminder_kululu_dated_tables` | `1690650729353087` | UTILITY | APPROVED |
| `event_reminder_kululu_dated_tables_gift` | `1754732178971006` | UTILITY | APPROVED |
| `event_reminder_kululu_today` | `1113692351549436` | MARKETING | APPROVED |
| `event_reminder_kululu_today_gift` | `1998875420758408` | UTILITY | APPROVED |
| `event_reminder_kululu_today_tables` | `2172022213398666` | UTILITY | APPROVED |
| `event_reminder_kululu_today_tables_gift` | `1832654268051573` | MARKETING | APPROVED |
| `follow_up_kululu` | `1642722947634597` | MARKETING | APPROVED |
| `follow_up_kululu_image` | `1032250216571871` | MARKETING | APPROVED |
| `invitation_kululu` | `1825733545125481` | MARKETING | APPROVED |
| `invitation_kululu_image` | `1683189443272649` | MARKETING | APPROVED |
| `invitation_kululu_video` | `1940174040699292` | MARKETING | APPROVED |
| `thank_you_kululu` | `1597159178387055` | MARKETING | APPROVED |
| `thank_you_kululu_gift` | `4577909395862996` | MARKETING | APPROVED |

Status read from Meta on 2026-11-13. Meta moved three Reminders to MARKETING (`event_reminder_kululu_today`, `_today_tables_gift`, `_dated`) and kept the other five UTILITY, so the Reminder family is mixed. Accepted, not fought (ADR 0053): it changes only the price and the marketing caps of those three shapes.

These were submitted from payloads built by a one-off script, not from the phase 2 code
(section 5 planned the code). Phase 2's `meta-templates.ts` must reproduce these bodies,
buttons and samples exactly; its test should compare against this table's templates.

### 3.2 Personal Message - 27 templates (Wrappers approved 2026-11-13)

All MARKETING (ADR 0046). Body for each paragraph count, with the Wrapper lines of the
stage (brief section 7.1):

```
{opening line}

{{1}}
·
{{2}}
·
{{3}}

{closing line}
```

`_p1` has `{{1}}` only, `_p2` has `{{1}}` and `{{2}}`. Every `{{n}}` is the Owner's
paragraph n, Message Fields filled in. The separator is whatever the probe settles.

| Stage | Opening line | Closing line | Buttons |
|---|---|---|---|
| Invitation | הזמנה לאירוע 💌 | נשמח לדעת אם תגיעו 👇 | quick replies `נגיע בשמחה`, `לא נוכל להגיע` |
| Follow-up | עדיין מחכים לתשובה 💌 | נשמח לדעת אם תגיעו 👇 | same |
| Event Reminder | תזכורת לאירוע 🎉 | לניווט לאירוע 👇 | URL `ניווט לאירוע`; plus `שליחת מתנה` on `_gift` |
| Thank You | תודה מכל הלב ❤️ | `❤️`, or `לשליחת מתנה 👇` on `_gift` | URL `שליחת מתנה` on `_gift` only |

| Stage | Names | Count |
|---|---|---|
| Invitation | `invitation_personal_p{1,2,3}`, `invitation_personal_image_p{1,2,3}`, `invitation_personal_video_p{1,2,3}` | 9 |
| Follow-up | `follow_up_personal_p{1,2,3}`, `follow_up_personal_image_p{1,2,3}` | 6 |
| Event Reminder | `event_reminder_personal_p{1,2,3}`, `event_reminder_personal_gift_p{1,2,3}` | 6 |
| Thank You | `thank_you_personal_p{1,2,3}`, `thank_you_personal_gift_p{1,2,3}` | 6 |

Picked by: stage, Personal Message chosen and not empty, attachment (Asks), gift switch
(Reminder, Thank You), and the number of non-empty paragraphs after collapsing. The
Reminder's day and the Guest's table do not pick a Personal Message template: the Wrapper
reads the same on any day, and the table sentence is part of the Owner's paragraph,
dropped for a Guest with no table before the paragraph is sent.

#### Personal Message status

The Owner approved the Follow-up, Event Reminder and Thank You Wrappers on 2026-11-13 (as in the table above, with no gift line on the Reminder). The 24 templates beyond the probe were submitted by API that day, with the same sample media as the Kululu Wording. Sample paragraphs are realistic Owner text per stage; `_p1` joins the first two, as the approved probe did.

| Template | Template id | Category Meta gave | Status |
|---|---|---|---|
| `event_reminder_personal_gift_p1` | `1040688482369094` | MARKETING | APPROVED |
| `event_reminder_personal_gift_p2` | `1657883159342499` | MARKETING | APPROVED |
| `event_reminder_personal_gift_p3` | `3344927989042420` | MARKETING | PENDING |
| `event_reminder_personal_p1` | `1510587894465250` | MARKETING | PENDING |
| `event_reminder_personal_p2` | `1150671940836910` | MARKETING | PENDING |
| `event_reminder_personal_p3` | `1664934258375933` | MARKETING | PENDING |
| `follow_up_personal_image_p1` | `1164340149871168` | MARKETING | PENDING |
| `follow_up_personal_image_p2` | `1149715150944577` | MARKETING | PENDING |
| `follow_up_personal_image_p3` | `1881127416380571` | MARKETING | PENDING |
| `follow_up_personal_p1` | `2125640318055166` | MARKETING | PENDING |
| `follow_up_personal_p2` | `1174198461839052` | MARKETING | PENDING |
| `follow_up_personal_p3` | `2214045882789892` | MARKETING | PENDING |
| `invitation_personal_image_p1` | `1112456678257604` | MARKETING | PENDING |
| `invitation_personal_image_p2` | `1123648897051289` | MARKETING | PENDING |
| `invitation_personal_image_p3` | `29138044522518139` | MARKETING | PENDING |
| `invitation_personal_p1` | `1639159083779029` | MARKETING | APPROVED |
| `invitation_personal_p2` | `2147214855922535` | MARKETING | APPROVED |
| `invitation_personal_p3` | `2583589052116072` | MARKETING | APPROVED |
| `invitation_personal_video_p1` | `1317785273778593` | MARKETING | PENDING |
| `invitation_personal_video_p2` | `1130871346462188` | MARKETING | PENDING |
| `invitation_personal_video_p3` | `1913213633379138` | MARKETING | PENDING |
| `thank_you_personal_gift_p1` | `30295324733403829` | MARKETING | PENDING |
| `thank_you_personal_gift_p2` | `1423611284171782` | MARKETING | PENDING |
| `thank_you_personal_gift_p3` | `1143106324972784` | MARKETING | PENDING |
| `thank_you_personal_p1` | `1414386670681149` | MARKETING | PENDING |
| `thank_you_personal_p2` | `2245087083023991` | MARKETING | PENDING |
| `thank_you_personal_p3` | `29373795682304649` | MARKETING | PENDING |

Status read from Meta on 2026-11-13.

### 3.3 Totals

| | Invitation | Follow-up | Event Reminder | Thank You | Total |
|---|---|---|---|---|---|
| Kululu Wording | 3 (MARKETING) | 2 (MARKETING) | 8 (UTILITY) | 2 (MARKETING) | 15 |
| Personal Message | 9 | 6 | 6 | 6 | 27 (all MARKETING) |
| | 12 | 8 | 14 | 8 | **42** |

### 3.4 Reconciling with ADR 0054

The count matches: 15 + 27 = 42, under these readings, each of which is what the ADRs say
but is worth a second look:

- **Personal Reminder has no day axis and no table axis.** Right per ADR 0054 (the Wrapper
  is the same on any day) and CONTEXT.md (a Guest with no table is sent the message without
  the table sentence). If the Wrapper were ever made day-dependent, that is +6.
- **The Personal Reminder's closing line does not change with the gift.** Decided by the
  Owner on 2026-11-12: no gift line. `_gift` closes on `לניווט לאירוע 👇` like the rest.
- **The Thank You's closing line changes with the gift** (brief 7.1). Free, since gift is
  already an axis.

Shapes the ADRs imply that no template covers. None changes the count, but each needs a
rule in phase 2 or 3:

- **The categories differ from ADR 0053**, which says the Asks go in as Utility. The Owner
  chose to match what Meta already gave the Classic originals (`confirmation_1*` are
  Marketing), so the Asks go in as Marketing. ADR 0053's Meta-categories consequence should
  be amended to say so.
- **An Ask in Kululu Wording for an Event with no venue yet.** The Invitation and
  Follow-up name the venue, and Meta rejects an empty parameter. Either the send refuses
  with a reason (as `missingOccasionPhrase` does) or it needs venue-less templates (+5).
  Today's `confirmation_1` has the same dependency, so refusing is the consistent choice.
- **The ceremony time.** The Kululu Reminder names the reception time only. Adding the
  ceremony time where the Event has one would double the Reminder (+8). Not proposed.
- **A Personal Message Reminder for an Event with no venue.** The navigation button needs
  a short code, not a venue, so this is the same rule as today: a Reminder needs a venue
  (ADR 0053), enforced before send, not by template.

Nothing counted in the 42 is unimplied by the ADRs.

## 4. Submitting

### 4.1 Can the app's system user create templates?

Creating templates needs the `whatsapp_business_management` permission on the WABA;
reading templates needs the same permission, so a token that can list templates very likely
can create them too. Meta's docs pages read on 2026-11-12 do not name the scope for create
(they show only a 403 "Insufficient permissions to create templates"), so the check below
is what decides.

Read-only check, run 2026-11-12 with the Owner's permission: `debug_token` on
`WHATSAPP_ACCESS_TOKEN` (its `scopes` and `granular_scopes`), and a list of the WABA's
template names and categories. It printed no token.

| Check | Result |
|---|---|
| Token | `SYSTEM_USER` of app Kululu (`1607101830303923`), valid, never expires |
| `scopes` | `whatsapp_business_management`, `whatsapp_business_messaging`, `public_profile` |
| `granular_scopes` target ids | none listed for either scope, which means every asset the system user is assigned, not a restricted list |
| Existing template names collide with section 1 | no: 60 templates on the WABA, none `invitation_*`, `follow_up_*` (other than Classic `follow_up_confirmation_*`), `*_kululu*` or `*_personal_p*` |
| Can it create | **yes**, proven: the three probes were created by API (2.4) |

Worth knowing from the same listing: Meta moved most Utility submissions to Marketing
(`confirmation_1*`, `thank_you_1`, `thank_you_1_gift`, the whole `wedding_event_reminder_1`
family), but kept `event_reminder_1*` (8) and `advance_reminder_1*` as Utility. The
transactional Reminder wording has held Utility; the Asks have not, so expect the
Invitation and Follow-up Kululu Wordings to come back Marketing.

### 4.2 By API

For each approved payload, from a shell where `WHATSAPP_ACCESS_TOKEN` is set:

```bash
curl -s -X POST "https://graph.facebook.com/v22.0/1288067446631547/message_templates" \
  -H "Authorization: Bearer $WHATSAPP_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data @invitation_personal_p2.json
```

The response is `{"id": "...", "status": "PENDING", "category": "MARKETING"}`. Record the
id and status in 2.4. Meta allows 100 template creations per hour per account.

### 4.3 By hand, in WhatsApp Manager

If the token cannot create templates:

1. business.facebook.com > WhatsApp Manager > the Kululu account > Message templates >
   Create template.
2. Category **Marketing**, type **Default** (custom). Name as in section 2, language
   **Hebrew**.
3. Header: none. Body: paste the body text from 2.1 exactly, with the blank lines and the
   `·` lines. Add each variable with "Add variable" so they number `{{1}}`, `{{2}}`,
   `{{3}}` in order, and type the sample values from 2.1.
4. Footer: none. Buttons: Quick reply, twice: `נגיע בשמחה`, then `לא נוכל להגיע`.
5. Submit. Copy the template id from the template's page into 2.4.

## 5. Order

1. Probe: the three templates of section 2. Wait for Meta's answer.
2. If `·` is rejected, edit to the fallback (2.3) and wait again.
3. Write the separator into the phase 2 code (ADR 0055) and the editor.
4. The Owner approves the Kululu Wordings (3.1) and the Wrappers (3.2).
5. Submit the other 39 from the phase 2 `meta-templates.ts` script, never by hand-copying
   this file.

## 6. Uncertain under Meta's rules

Checked on 2026-11-12 against:
[Template fundamentals](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/),
[Components](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/components),
[Template categorization](https://developers.facebook.com/docs/whatsapp/updates-to-pricing/new-template-guidelines/),
[Message template API](https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-account/message-template-api),
[Supported languages](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/supported-languages),
[debug_token](https://developers.facebook.com/docs/graph-api/reference/debug_token/).

- **A body that opens or closes on a variable.** Not stated on any page read. The
  restriction is known from this repo's own review history (ADR 0054,
  `personal-message-templates.md`), so every body here opens and closes on fixed text.
- **Two variables with only the separator between them.** Not stated either. Meta's
  review has rejected adjacent variables before; whether a one-character line counts as
  "text between" is exactly what the probe tests.
- **Variables relative to fixed text.** WhatsApp Manager warns when a template has "too
  many variable parameters relative to the message length", but the docs read state no
  ratio. `_p3` has about 40 fixed characters around three variables, the riskiest of the
  probe. If it is rejected for that, the remedy is a longer Wrapper, not a different
  separator.
- **Line breaks inside a parameter (132018).** Not on the pages read; known from
  production (ADR 0054). Each paragraph is one line, and the cleaning step removes tabs and
  runs of more than four spaces.
- **Samples.** One sample per variable is required, in variable order, as
  `example.body_text` (an array holding one array). Confirmed.
- **Length.** Body at most 1024 characters, confirmed. The longest Personal Message body
  is 400 characters of paragraphs plus about 60 of Wrapper, well inside.
- **Video header.** Supported, sample supplied by `header_handle` from the Resumable
  Upload API. The docs read gave no video size or format limit; the app's own rule is MP4
  up to 16MB (brief 6.2). Check the Resumable Upload and media pages before the video
  templates are submitted.
- **Buttons.** Up to 10 quick replies, 25 characters each; at most 2 URL buttons, one
  variable at the end of the URL. Every button here fits. No template mixes quick replies
  with URL buttons.
- **Category review.** Since 9 April 2025 a template submitted as Utility that Meta judges
  Marketing is approved as Marketing, with a day's notice (none for an account warned for
  misuse). `allow_category_change` is described as the default now on one page and still
  listed on another; it is left out. A Utility-restricted account cannot create Utility
  templates at all. Utility must be "non-promotional" and tied to something the user
  requested or a transaction. The Asks and the Reminder are written for that; the Thank You
  and every Personal Message go in as Marketing so there is nothing to recategorize.
- **Duplicate bodies.** Templates whose text differs only in the header (`_image`,
  `_video`) may be flagged as duplicates. The Classic catalog already holds header-only
  pairs that were approved (`personal_message_confirmation` / `_image`), so these are
  probably safe. Less certain: ten Kululu Wording bodies are word-for-word copies of
  approved Classic templates under new names (3.1). Not stated on any page read; the first
  submission will show it.
- **Names.** Lowercase letters, digits and underscores, up to 512 characters. Confirmed.
- **Language.** Hebrew is `he`. Confirmed.
