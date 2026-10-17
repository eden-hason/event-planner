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
היי {{1}}, איזה כיף שהצטרפת ל-Kululu! 🎉

החבילה שלך: {{2}}, {{3}} רשומות.
ההזמנות וסבבי האישורים כבר מחכים לך במערכת - אפשר לראות, לערוך ולתזמן הכל משם:
https://kulu-lu.com/app

יש שאלה? אנחנו זמינים בוואטסאפ, בכפתור למטה
```

The app link is plain text in the body, not a button. WhatsApp opens a template button in
its own in-app browser, where the Owner is not signed in. A link in the body opens in the
phone's own browser. It is static: `/app` sends a signed-in Owner to their latest Event's
Home, and asks anyone else to sign in first.

Addressed to one person, because it goes to the Event's creator only. Every second-person
word (הצטרפת, שלך, לך) is spelled the same for a man and a woman in unpointed Hebrew, so
the message needs no gender. Keep it that way in any rewording: "ברוך הבא" or "תוכל"
would force a guess.

| Param | Value | Example for Meta review |
|---|---|---|
| `{{1}}` | Owner's first name | נועה |
| `{{2}}` | Plan: `WhatsApp` or `WhatsApp + שיחות` | WhatsApp + שיחות |
| `{{3}}` | Paid + Bonus Records at first payment | 220 |

**Buttons**

1. URL, static: text `דברו איתנו`, URL `https://kulu-lu.com/support`. Meta does not
   accept a `wa.me` link in a template button, so the button opens Kululu's own domain and
   `next.config.ts` redirects to `wa.me/972552639234` (`KULULU_WHATSAPP_NUMBER` in
   `src/features/billing/utils/contact.ts`, the same line the homepage uses).

## `owner_post_event_1`

Sent at 18:00 Israel the day after the Event, or Sunday if that day is Saturday.

**Body**

```
היי {{1}},
שמחנו לקחת חלק בתכנון האירוע המרגש שלכם! מקווים שנהניתם מכל רגע.

כל המידע מהאירוע נשאר זמין לכם במערכת.
יש לכם אפשרות לתעד במערכת את המתנות שקיבלתם, בצורה פשוטה ונוחה 🎁

אם הייתם מרוצים מהחוויה איתנו, נשמח ממש להמלצה קצרה מכם בדף העסק שלנו 💜
https://kulu-lu.com/review

תודה ענקית על האמון והבחירה ב-Kululu 🙏🏼
```

| Param | Value | Example |
|---|---|---|
| `{{1}}` | Owner's first name | נועה |

**Buttons:** none. The gifting page is mentioned in the text only. The review link is plain
text in the body, so it opens in the phone's own browser rather than WhatsApp's.
`/review` is Kululu's own short link: `next.config.ts` redirects it to
`GOOGLE_REVIEW_URL` in `src/lib/config/contact.ts`, the Business Profile's "Ask for
reviews" link (`https://g.page/r/CdLdsV8gjwUVEAI/review`), which opens the review form
directly. Changing it there changes nothing in the template.

## Before turning it on

- Both templates must be approved in Meta before the migration reaches production. Until
  then a send is rejected by Meta and recorded as failed, visible in the Back Office.
- If Meta reclassifies `owner_post_event_1` as marketing, accept it (ADR 0039).
