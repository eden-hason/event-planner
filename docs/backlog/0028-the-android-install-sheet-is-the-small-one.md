# The Android install sheet is the small one

Status: open

## The problem

When an Owner taps "Add" on the **Install Card** on Android, Chrome opens its own install
sheet. That sheet comes in two sizes. The small one shows only the icon, the name and the
domain. The larger one adds a short description and a strip of app screenshots, so the
person can see what they're installing before they tap Install. Chrome picks the size from
the manifest, and ours (`src/app/manifest.ts`) has no `description` and no `screenshots`, so
every Owner gets the small sheet.

This was deferred from the Install Card work
([`../install-card-plan.md`](../install-card-plan.md)), which ships with the manifest as it is
apart from `start_url`, `id` and `scope`.

## What is already known

- **Both fields are needed.** Chrome on Android shows the larger sheet only when the
  manifest has a `description` **and** at least one screenshot meant for phones (one with no
  `form_factor`, or `form_factor: 'narrow'`). `'wide'` screenshots are for desktop and are
  ignored on a phone.
- **Screenshot rules, as last checked** (verify against Chrome's current docs before
  building): PNG, JPEG or WebP; each side between 320 and 3840px; the long side no more than
  2.3 times the short side; all the phone screenshots the same aspect ratio. Chrome shows
  only the first few.
- **The manifest has no `lang` or `dir`.** The name is Hebrew (`Kululu אישורי הגעה`), and a
  Hebrew description would be laid out in the sheet with no direction hint. Add `lang: 'he'`
  and `dir: 'rtl'` along with it.
- **Screenshots must not show real people.** They're served publicly from `public/` to
  anyone who installs. Capture them from a seeded sample Event, never from a real Event on
  production.
- **They go stale.** Each screenshot is a copy of the UI on the day it was taken. When Home,
  Guests or Results are redesigned, the screenshots have to be taken again, or the sheet
  advertises an app that no longer looks like that.
- **Measurable.** `install_prompt_result` (from the Install Card work) logs `accepted` or
  `dismissed` for every sheet shown, so the acceptance rate before and after this change can
  be compared directly.

## Still unknown

- Whether Samsung Internet and Edge on Android show a larger sheet from the same fields, or
  always show their own small dialog.
- Which three or four screens sell the app best. Likely candidates are Home with its Hero,
  Results, and the WhatsApp RSVP conversation, but that's a marketing call.
- Whether the iOS sheet uses any of this. As far as we know, iOS Add to Home Screen ignores
  both fields.

## Done would mean

Tapping "Add" on Android Chrome opens the larger install sheet with a Hebrew description
and three or four phone screenshots of a sample Event. There's a known, written-down way to
retake the screenshots when the UI changes, and the `install_prompt_result` acceptance rate
has been compared before and after.
