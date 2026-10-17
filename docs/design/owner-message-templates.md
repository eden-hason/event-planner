# Owner Message templates

The two Meta WhatsApp templates behind the Owner Messages (ADR 0039). They are not catalog
Templates, so nothing in `message_templates` holds them. The code names them in
`src/features/owner-messages/utils/payload.ts` (`OWNER_MESSAGE_TEMPLATES`) and fills the
parameters below. If a template is renamed or its parameters change, change both.

Language `he`, category `UTILITY` for both.

## `owner_welcome_1`

Sent the first time an Event is paid.

**Body**

```
היי {{1}}, ברוכים הבאים ל-Kululu! 🎉
הכל מוכן ל{{2}} שלכם ב-{{3}}.

החבילה שלכם: {{4}}, {{5}} רשומות.
ההזמנות וסבבי האישורים כבר מחכים לכם במערכת - אפשר לראות, לערוך ולתזמן הכל משם.

יש שאלה? אנחנו זמינים בוואטסאפ, בכפתור למטה 💜
```

| Param | Value | Example for Meta review |
|---|---|---|
| `{{1}}` | Owner's first name | נועה |
| `{{2}}` | Occasion noun: חתונה / חינה / בר המצווה / בת המצווה, else אירוע | חתונה |
| `{{3}}` | Event date, `d.M.yyyy` | 12.11.2026 |
| `{{4}}` | Plan: `WhatsApp` or `WhatsApp + שיחות` | WhatsApp + שיחות |
| `{{5}}` | Paid + Bonus Records at first payment | 220 |

**Buttons**

1. URL, dynamic: text `לאירוע שלי`, URL `https://<site domain>/{{1}}`. The code sends
   `app/<eventId>/home` as the suffix. Example: `app/00000000-0000-0000-0000-000000000000/home`
2. URL, static: text `דברו איתנו`, URL `https://wa.me/<support number>`. The billing
   contact in `src/features/billing/utils/contact.ts` is `972552639234`, if that is the
   staffed number.

## `owner_post_event_1`

Sent at 18:00 Israel the day after the Event, or Sunday if that day is Saturday.

**Body**

```
היי {{1}}
שמחנו לקחת חלק בתכנון האירוע המרגש שלכם! מקווים שנהניתם מכל רגע ושאתם עדיין בעננים

כל המידע מהאירוע נשאר זמין לכם במערכת.

יש לכם אפשרות לתעד במערכת את המתנות שקיבלתם, בצורה פשוטה ונוחה 🎁

אם הייתם מרוצים מהחוויה איתנו, נשמח ממש להמלצה קצרה מכם בדף העסק שלנו בגוגל 💜
זה לוקח רק רגע ועוזר לנו מאוד להגיע לעוד אנשים 🙏🏼

תודה ענקית על האמון והבחירה ב-Kululu
```

| Param | Value | Example |
|---|---|---|
| `{{1}}` | Owner's first name | נועה |

**Buttons**, gifts first, so the template stays utility:

1. URL, dynamic: text `לתיעוד המתנות`, URL `https://<site domain>/{{1}}`. The code sends
   `app/<eventId>/gifting`.
2. URL, static: text `להמלצה בגוגל`, URL the Google Business Profile "Ask for reviews" link
   (`https://g.page/r/<id>/review`), not the `maps.google.com/?cid=...` page link.

## Before turning it on

- Both templates must be approved in Meta before the migration reaches production. Until
  then a send is rejected by Meta and recorded as failed, visible in the Back Office.
- If Meta reclassifies `owner_post_event_1` as marketing, accept it (ADR 0039).
