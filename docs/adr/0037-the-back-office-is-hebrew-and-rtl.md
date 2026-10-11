# The Back Office is Hebrew and RTL

Date: 2026-10-11

## Status

Accepted. Supersedes the "LTR and English" constraint in
`docs/design/back-office-overview-brief.md` section 8 and
`docs/design/back-office-operations-brief.md`.

## Context

The Back Office was built English and LTR, nested inside an app whose <html> is Hebrew and RTL.
That cost a `dir="ltr"` wrapper and per-portal workarounds (dialogs, sheets and the mobile
sidebar each re-declared the direction and re-pinned their close button), and it meant the
Operators - who work in Hebrew, with Owners and Guests who write in Hebrew - read a second
language for their own tool.

## Decision

`/admin` is **Hebrew only and RTL**. It inherits `dir` from the root <html> like the Owner app,
so portals need nothing re-declared, and layout uses logical classes (`ms-`, `ps-`, `text-end`,
`border-s`). The sidebar sits on the right.

Copy is **hardcoded Hebrew, not next-intl**. A Hebrew default with an English toggle was
offered and declined: nobody reads the Back Office in English, and a catalog would double every
string for a language with no reader. Hebrew dates and catalog names (event types, schedule
types, roles) go through `src/features/admin/utils/format.ts` and `utils/labels.ts`, so the
database's English `name` columns never reach the screen.

## Consequences

- Text stored in the database stays as written: dispatch reasons, delivery error messages and
  template keys are data and still show in English where an Operator reads them raw.
- Server Actions that only the Back Office calls (billing, call rounds, manual send, SMS
  Fallback) return Hebrew messages.
- Going back to English is a full translation pass, not a switch.
