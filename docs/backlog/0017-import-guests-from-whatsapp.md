# 0017 - Guests cannot be imported from the Owner's WhatsApp contacts and groups

Status: in progress - see [the build plan](../whatsapp-import-plan.md)

## The problem

Most Owners already have their guest list in WhatsApp: in contacts, and in groups such as
the family group, the friends group, or a gift-collection group. Today they have to rebuild
it by hand or as a file. The Add guests sheet (`add-guest-source-sheet.tsx`) offers single
guest, file upload and Google Drive, but nothing that reads WhatsApp.

A competing event app does this with a WhatsApp **linked device**. The Owner clicks
"Import from WhatsApp", enters their phone number and sees an 8-character code. Their
phone shows a "link a new device" notification, they enter the code, and the app reads
their contacts and groups. We want the same flow. The link only needs to live for the
import, so persisting it is not a goal.

## How it works

There is no official Meta API for this. The WhatsApp Business / Cloud API we send with
(`src/features/schedules/services/post-whatsapp.ts`) cannot read a user's contacts or
groups. The flow goes through the **WhatsApp Web multi-device protocol**, the same one
WhatsApp Web/Desktop speak, via a reverse-engineered client library. The spike used
[Baileys](https://github.com/WhiskeySockets/Baileys) `7.0.0-rc14` (Node).

1. Open a WebSocket to WhatsApp with freshly generated Signal keys, held in memory only.
2. When the socket is ready (Baileys emits `qr`), call `requestPairingCode(phone)`.
   WhatsApp pushes the "link a device" notification to that phone and returns the code.
3. The Owner enters the code on the phone. The server gets `pair-success`, then a
   forced disconnect (`restartRequired`, 515). Reconnecting with the same in-memory keys
   completes the link. Missing this reconnect is the usual failure.
4. The initial sync arrives as events: `messaging-history.set` (chats, push names,
   hidden-ID-to-phone mappings) and `contacts.upsert` (from the app-state
   `critical_unblock_low` collection, which carries the Owner's saved names).
   `groupFetchAllParticipating()` returns every group with its participants.
5. `sock.logout()` removes the device from the phone's Linked devices list.

## Evidence from the spike (2026-10-03)

Run against the author's own account (`spikes/whatsapp-import/spike.mjs`, not committed;
`out/` holds real personal data and is gitignored).

**Timing.** Linking took 28-40s, nearly all of it the user typing the code. After the
link, contacts arrived within about 4s, and groups come back in one request. A real flow
can show data about 10s after linking, not the 45s the spike waited.

**Phone numbers resolve.** All 89 groups use hidden-ID addressing (`addressingMode: lid`:
participants show as `…@lid`, without a phone). The pairing sync still carries the
mappings, so **2,161 of 2,163 participants resolved to a phone number**, including all
793 members of the largest group. Before the spike, this hidden-ID addressing was the
biggest worry about the feature. It does not block it.

**Names are the limit.**

| | People | Saved name | Only the name they set themselves | No name |
|---|---|---|---|---|
| Contacts (merged across phone and hidden ID) | 2,120 | 163 | 1,840 | 117 |
| Unique people across all groups | 1,669 | 98 | 635 | **936** |

- **Saved names (what the Owner typed into their phone) are rare: 163.** The log shows
  the contacts collection fully re-downloaded from scratch (`critical_unblock_low`
  synced to v1 from a forced snapshot) with no errors, and a second forced resync added
  nothing. So the snapshot really holds only 163 names. Waiting longer or retrying does
  not help. The phone's address book is not shared with linked devices this way.
- **Group metadata has no names at all**, only IDs and phone numbers. A group member
  gets a name only if they also appear in the Owner's chats or contacts. In large groups
  of strangers most members are a bare phone number. Small personal groups (family, gift
  groups, bachelor parties) are well covered.
- 445 contacts are hidden-ID-only chats with no resolvable phone. They should be dropped
  from the import list.

**Pairing rejections.** One attempt, minutes after a previous link and unlink, was
rejected on the phone as a bad link code, even though WhatsApp had accepted the
pairing request. The retry about 15 minutes later worked. This looks like WhatsApp
throttling repeat links, or a stale notification being tapped. The UI should tell the
user to wait and retry, and offer "Link with phone number instead" in Linked devices
as the manual path.

## Checked and found false

- *"Hidden-ID groups will hide most phone numbers."* False for this account: 99.9%
  resolved.
- *"Missing saved names are a sync timing problem."* False. The first runs showed 43,
  but that was a bug in the spike's merge: Baileys emits partial contacts with
  `name: undefined`, and spreading them erased names that had already arrived. Fixed,
  the count is 163, and a forced full resync did not change it.

## Not explored

- **Full history sync** (`syncFullHistory: true`). The push-name chunk returned exactly
  **2,000** contacts, which looks like a page cap. A full sync might return more
  self-set names and fill some of the 936 blanks, at the cost of a longer and heavier
  sync. Deferred on purpose.
- Behaviour on an account with fewer chats, on iOS vs Android, and on WhatsApp Business
  accounts. The spike ran on one Android account.

## Constraints on a real build

- **Terms of service.** Any third-party linked-device client violates WhatsApp's terms.
  Read-only, linked for a few minutes and sending nothing is the lowest-risk use. The
  risk lands on the Owner's own number, not ours. The library can break without notice
  when WhatsApp changes the protocol, so this must be a best-effort import with the file
  import as the fallback.
- **The page goes away mid-flow (found in production, 2026-10-03).** On a phone the Owner
  switches to WhatsApp to enter the code, and the browser suspends the tab and its
  connections. A session tied to an open request dies right there. The session must run
  independently and let the page catch up. See the revision in
  `docs/whatsapp-import-plan.md`.
- **Hosting.** Each import holds a WebSocket for 1-3 minutes, and the restart after
  pairing must reconnect with the same in-memory keys. That rules out stateless
  request/response functions. It needs a small always-on Node service (e.g. Fly,
  Railway), with sessions as in-memory objects with a TTL: `POST /sessions {phone}` →
  `{id, code}`, `GET /sessions/:id` → status and data, `DELETE /sessions/:id` →
  logout. The Next.js side calls it from a Server Action with a shared secret.
- **Privacy.** It pulls third parties' phone numbers and names. Nothing but the rows the
  Owner chooses to import should be stored. No auth state persists, and the device is
  unlinked at the end. The privacy policy needs a line for it (compare 0015).
- **Import UX.** Show groups first, since they are instant and complete. Name each person
  by saved name, then the name they set, then blank. Make filling in blank names cheap,
  since about half the members of a large group will have none. Merge into the existing
  guests import path (`src/features/guests/components/mobile/import/`,
  `.../groups/import-guests-dialog/`) rather than a parallel one.

## Done means

An Owner can pick "Import from WhatsApp" in Add guests, link with a pairing code, choose
groups and/or contacts, review rows with missing names flagged, and import them as
guests. The linked device is gone from their phone when the flow ends, success or not,
and nothing from the session is kept server-side beyond the imported guests.
