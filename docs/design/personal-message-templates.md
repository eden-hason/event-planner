# Personal Message templates

The twelve Meta WhatsApp templates behind the **Personal Message** (ADR 0046). They are
catalog Templates: `supabase/migrations/20261027000001_personal_message_templates.sql` and
`20261028000000_personal_message_bare_frame.sql` hold them in `message_templates`
(`personal_message = true`), with the six SMS Renditions beside them. If a body, button
or parameter changes here, change the migration's row too.

Language `he`, category **`MARKETING`** for all twelve, on purpose. Kululu does not write the
Owner's paragraph, so it cannot promise Meta it is non-promotional. Do not submit them as
Utility.

## The Owner's paragraph

Every template opens on `משפחה וחברים יקרים,` and the Owner's paragraph follows it
directly, so the Owner says who is inviting, to what, and on a reminder that it is today.
No frame carries the Occasion Phrase or the reminder's today line.

Every template has one `{{n}}` for the Owner's paragraph: at most 300 characters, one line.
A line break the Owner typed is sent as ` | ` (the `personalMessage` transformer), because
Meta refuses a parameter holding a line break, a tab or more than four spaces in a row
(132018). It never opens or closes the body and never sits directly against another
variable, which Meta's review rejects.

Example value for every template's review (about 300 characters):

```
אחרי שנתיים של תכנון, המון התרגשות וקצת לחץ, הגיע הזמן! נשמח מאוד שתהיו איתנו ביום הכי שמח שלנו. מי שמגיע מהצפון - יש חניה חינם ליד האולם, ומי שצריך הסעה מוזמן לכתוב לנו. בלי מתנות בבקשה, הנוכחות שלכם היא המתנה הכי גדולה. לא יכולים לחכות לראות את כולכם, רוקדים עד הבוקר!
```

## Initial Invitation

`personal_message_initial_invitation` (no header) and
`personal_message_initial_invitation_image` (image header: the invitation image).

```
משפחה וחברים יקרים,
{{1}}

📅 {{2}}
📍 {{3}}

נשמח לראותכם ❤️
```

| Param | Value | Example |
|---|---|---|
| `{{1}}` | The Owner's paragraph | (above) |
| `{{2}}` | Event date, full, he-IL | יום חמישי, 12 בנובמבר 2026 |
| `{{3}}` | Venue name | אולמי הגן, ראשון לציון |

**Buttons:** none, like the current default `save_the_date_1_image_no_button`.

## Confirmation

`personal_message_confirmation` (no header) and `personal_message_confirmation_image`
(image header). The same frame for every round.

```
משפחה וחברים יקרים,
{{1}}

📅 {{2}}
📍 {{3}}

נשמח לדעת אם תגיעו 🙏🏼
```

Parameters as for the Initial Invitation.

**Buttons:** quick replies, text exactly as `confirmation_1`, because the Confirmation
Conversation starts from their payloads:

1. `נגיע בשמחה`
2. `לא נוכל להגיע`

### Bare Frame

`personal_message_confirmation_bare` (no header) and
`personal_message_confirmation_bare_image` (image header), `bare_frame = true`. Sent when
the Owner turns off "Show the date and venue": no Event details at all, only the greeting
before the Owner's paragraph and the closing line after it, which is what keeps `{{1}}` off
the start and end of the body. The Owner writes the date and venue, or leaves them out.

```
משפחה וחברים יקרים,
{{1}}

נשמח לדעת אם תגיעו 🙏🏼
```

| Param | Value | Example |
|---|---|---|
| `{{1}}` | The Owner's paragraph | (above) |

**Buttons:** the same two quick replies.

No SMS Rendition: an SMS Fallback of a Bare Frame goes in the ordinary Confirmation SMS
frame above, date and venue included.

Only the Confirmation has a Bare Frame. The other stages keep the facts in their frame.

## Event Reminder

`personal_message_event_reminder`, `_gift`, `_tables`, `_tables_gift`.

Without table numbers:

```
משפחה וחברים יקרים,
{{1}}

📍 {{2}}
🕐 {{3}}

מחכים לחגוג איתכם ❤️
```

With table numbers (`_tables`, `_tables_gift`), the line `🪑 מספר השולחן שלכם: {{4}}`
follows the time.

| Param | Value | Example |
|---|---|---|
| `{{1}}` | The Owner's paragraph | (above) |
| `{{2}}` | Venue name | אולמי הגן, ראשון לציון |
| `{{3}}` | Reception time | 19:30 |
| `{{4}}` | Table number (`_tables` only) | 12 |

**Buttons:** URL buttons, dynamic suffix = the Event's short code:

1. `ניווט לאירוע`, base `https://kulu-lu.com/nav/` (every row)
2. `שליחת מתנה`, base `https://kulu-lu.com/r/` (`_gift` rows only)

## Thank You

`personal_message_post_event` (no button) and `personal_message_post_event_gift`.

```
משפחה וחברים יקרים,
{{1}}

אוהבים ומעריכים ❤️
```

| Param | Value | Example |
|---|---|---|
| `{{1}}` | The Owner's paragraph | (above) |

**Buttons:** `_gift` only: URL `שליחת מתנה`, base `https://kulu-lu.com/r/`, dynamic suffix
= the Event's short code.

## Before turning it on

- The option is shown as soon as the migration is on production, before Meta approves the
  templates (accepted in ADR 0046). Until a template is approved, a Personal Message on
  it is rejected by Meta and recorded as failed, visible in the Back Office.
- Expect 131049 failures on these sends. Meta caps how many marketing messages a user
  receives. They count toward the Fallback Freeze like any other 131049.
