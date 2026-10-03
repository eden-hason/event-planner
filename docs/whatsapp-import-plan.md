# WhatsApp guest import - build plan

Backlog: [0017](backlog/0017-import-guests-from-whatsapp.md), which holds the spike evidence and the
risks. This file is the spec for building it.

## Decisions (2026-10-03)

| Question | Decision |
|---|---|
| Where it runs | Vercel. The session runs in the background of the request that starts it (`after`) and reports into a short-lived `whatsapp_import_sessions` row that the page polls. No separate service. See the revision below. |
| Platforms | **Mobile first**: the Add guests sheet and the `/guests/import` wizard. Desktop later. |
| What the Owner picks from | **Groups and contacts**: a Groups tab first, a Contacts tab second, merged and deduplicated by phone. |
| Guest group for WhatsApp-group members | **The Owner picks per group** with the existing `GroupCombobox`, blank by default. |
| People with no name | **Flag for editing** in the existing validate step. The Owner fills them in, or they are skipped as "missing name". |

## Revision (2026-10-03): a session row, not a stream

The first build held the whole session in one streaming request. It failed on the first
real phone test, and the reason was structural: on a phone the Owner **leaves the browser to
enter the pairing code in WhatsApp**, the browser suspends the backgrounded tab and cuts its
connections, the stream died, the page showed "Something went wrong", and the server
treated the disconnect as a cancel and unlinked the device. The spike never hit this because
it ran in a terminal. Any design for this flow has to survive the page going away for a
minute.

So now:

- `POST /api/events/[eventId]/whatsapp-import` validates, inserts a
  `whatsapp_import_sessions` row (RLS: the Owner inserts, reads and deletes their own) and
  returns `{ sessionId }`. The session runs after the response (`after`, within the route's
  `maxDuration`) and writes code, progress and result into the row with the service role
  (`services/whatsapp-import-session.ts`).
- `GET .../whatsapp-import/[sessionId]` is polled every 1.5s, plus immediately when the tab
  becomes visible again. A failed poll is expected while the tab is in the background and is
  just retried. The result travels once, on `done`.
- `DELETE .../whatsapp-import/[sessionId]` ends a session. The page calls it after reading
  the result, and on cancel. The running session checks its row every 2s and unlinks as soon
  as the row is gone, so deleting the row is the cancel.
- The Sweeper purges rows past `expires_at` (15 minutes). The result is other people's
  names and numbers, held server-side for minutes at most. The privacy copy says so.

The diagram below still shows the steps the Owner goes through. Only the transport changed.

## The shape

```
Add guests sheet ─▶ /guests/import?source=whatsapp
  whatsapp-link   phone → POST /api/events/[eventId]/whatsapp-import  (NDJSON stream)
                  ◀ {type:'code'} → show code, "check your phone"
                  ◀ {type:'linked'} → "reading your groups..."
                  ◀ {type:'groups'} ◀ {type:'contacts'} ◀ {type:'done'}   (server has logged out)
  whatsapp-pick   tabs Groups / Contacts, search, select; guest group per selected WhatsApp group
        │ toWhatsAppImportTable(selection) → ParsedCSV + fixed ColumnMapping {0:name,1:phone,2:group}
        ▼
  validate        existing MobileValidateStep (row edit sheet, duplicate checks, missing-name flags)
  summary         existing MobileSummaryStep → importGuests()
```

The validate and summary steps already work on a `ParsedCSV` plus a `ColumnMapping`
(`compute-import-rows.ts`). Turning the selection into that table means validation,
editing, duplicate detection, the skip-reason breakdown and `importGuests` are reused
unchanged. The analyze and review steps are skipped, because the mapping is known.

## Server

**`src/features/guests/services/whatsapp-import.ts`** (server-only, not in the barrel)
- `runWhatsAppImport({ phone, signal, deadlineMs, onEvent })` holds the Baileys logic
  proven in the spike:
  - in-memory auth;
  - pairing code on the first `qr`;
  - reconnect on `restartRequired`;
  - collect from `contacts.upsert`, `contacts.update`, `messaging-history.set` and
    `lid-mapping.update`;
  - `groupFetchAllParticipating()`, then hidden-ID → phone resolution.
- Emits groups as soon as they are fetched (about 1s after linking), and contacts once the
  sync is quiet (about 10s, capped), not the spike's fixed 45s wait.
- **`logout()` in `finally`**, on every path: done, error, abort (the client went away),
  and an internal deadline set well under `maxDuration`.
- Baileys logger silent in production. Phone numbers and names are never logged.

**`src/features/guests/utils/whatsapp-import.ts`** (pure, unit-tested)
- `mergeContact` drops `undefined` and empty fields before spreading. This was the bug that
  erased names in the spike.
- Folds the phone and hidden-ID entries for one person by phone. Name precedence: saved
  name, then the name they set, then blank.
- Drops contacts with no resolvable phone and non-person IDs (groups, broadcast,
  newsletters).
- `toWhatsAppImportTable(selection, groupMapping)` returns a `ParsedCSV` and a
  `ColumnMapping`. It dedupes by phone across groups and contacts; for the group mapping,
  the first selected group wins. Phones go through the existing `autoFixPhone`
  (`972…` → `05…`), so foreign numbers fail validation the same way they do in a file.

**Types** (`src/features/guests/types.ts`, new): `WhatsAppGroup`, `WhatsAppContact`,
`WhatsAppImportEvent` (the stream protocol).
**Schema** (`schemas/`): the phone input, digits only, international format, Israel
default.

**`src/app/api/events/[eventId]/whatsapp-import/route.ts`**
- `POST`, Node runtime, `maxDuration = 300`.
- Auth with `supabase.auth.getUser()`. Load the event with the user client, so RLS decides
  access; no manual ownership check.
- Returns a `ReadableStream` of newline-delimited JSON and passes `request.signal` through
  to the service.

**`next.config.ts`**: `serverExternalPackages: ['baileys']` (Baileys 7 is ESM-only with
optional native dependencies). Confirm with `npm run build` and a preview deployment.

**Dependency**: `baileys` pinned to an exact version (it is `7.0.0-rc14` today). It is a
release candidate and breaks when WhatsApp changes the protocol, so it gets no caret.

## Client (mobile)

- **`AddGuestSourceSheet`**: a new "Import from WhatsApp" row that goes to
  `/guests/import?source=whatsapp`, the same pattern as `?source=drive`.
- **`GuestImportFlow`**: new steps `whatsapp-link` and `whatsapp-pick`, feeding the existing
  `validate` and `summary` steps. Back from either step aborts the stream, which unlinks
  the device server-side.
- **`use-whatsapp-import.ts`** (hook): `fetch` plus a stream reader and an `AbortController`.
  Aborts on unmount. Exposes `status`, `code`, `groups`, `contacts` and `error`.
- **`whatsapp-link-step.tsx`**: phone input; then the code in large type with copy and
  instructions, including the fallback path "Linked devices → Link a device → Link with
  phone number instead"; then a waiting state; then a reading state. Errors:
  - rejected or expired code → "Wait a few minutes and try again";
  - timeout;
  - the connection dropped.
- **`whatsapp-pick-step.tsx`**: Groups and Contacts tabs, search, and per-row checkboxes
  (a group selects all its members). Each selected group gets a `GroupCombobox`. A footer
  shows "N people selected" and how many have no name.
- A short consent line before linking: read-only, unlinked when done, nothing stored
  except the guests you import.
- Copy goes in `messages/en.json` and `messages/he.json`, with no trailing periods and no
  em dashes.

## Phases

1. **Backend and pure logic**: the dependency, `next.config`, the pure utils with
   `*.test.ts`, the service, the route, and types and schema. Verified with tests, `tsc`,
   lint and `npm run build`.
2. **Link step and the Vercel check**: the source-sheet row, the hook and the link step,
   with groups and contacts dumped as a plain list. **Then pair once from a Vercel preview
   deployment.** This is the go/no-go for running on Vercel: the spike only ran from a home
   IP, and WhatsApp may treat cloud IPs differently. If pairing fails there, the service
   moves to an always-on host and nothing else in this plan changes.
3. **Pick step and the hand-off** to validate and summary: groups, contacts, mapping,
   dedupe and missing names.
4. **Polish**: error states, the consent copy, and analytics events (link started, linked,
   imported count).

## Out of scope for v1

- Desktop `ImportGuestsDialog`.
- Full history sync for more names (deferred, see 0017).
- Rate-limiting repeat links per user. An in-memory limit doesn't hold across Fluid
  instances; add a DB-backed one if abuse appears.
- Any persistent link or sending from the Owner's own number.

## Open

- A privacy policy line covering the WhatsApp import.
- Final Hebrew copy for the link and pick steps.
