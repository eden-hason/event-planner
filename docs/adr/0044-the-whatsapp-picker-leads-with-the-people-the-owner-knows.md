# The WhatsApp picker leads with the people the Owner knows

Date: 2026-10-25

## Status

Accepted. The chat-timestamp check it depended on ran on 2026-10-25 and passed (see
Evidence below).

## Context

The WhatsApp import (backlog 0017, `docs/whatsapp-import-plan.md`) reads the Owner's
groups and contacts through a short-lived linked device, then shows a pick step with a
Groups tab and a Contacts tab. The first real use on a phone (2026-10-25, 89 groups,
1,566 contacts) showed four problems:

- **A group can't be opened.** A card shows only "296 members · 291 with no name". The Owner
  can't see who is in it and can only take all of it or none of it. A large group of
  colleagues is useless even if ten of them are invited.
- **Contacts is mostly strangers.** The tab lists everyone the sync carries a name for,
  most of them people seen in group chats. Only about 163 are names the Owner saved
  (backlog 0017's spike). `sortContacts` sorts alphabetically with named people first, so
  names made of symbols and emoji (`.😑😑.`, `:={`, `<`, `~`) sit at the top.
- **A contact row gives no context.** A name such as `~Itay` or a bare number is hard to
  recognise without knowing where the Owner knows them from.
- **Missing names surface too late.** In the same run, 7 of the 18 people picked (39%) were
  skipped at the summary for having no name. Fixing them meant opening a full row-edit
  sheet for each one in the validate step.

Groups are also ordered by size, largest first, which puts the least relevant groups (a
296-member guild) at the top and the family groups below them.

## Decision

**The pick step leads with the people the Owner knows, and every person is shown with
where the Owner knows them from.**

1. **Contacts lists only people the Owner knows directly**, in two sections:
   - *Saved in your phone*: people with a saved name;
   - *Recent chats*: people the Owner has a one-on-one chat with, most recent first.

   **A person appears in one section only, the first that fits.** Someone the Owner saved
   and also chats with is under *Saved in your phone* and not repeated under *Recent
   chats*. Section counts are taken after this. *Saved in your phone* is ordered by last
   one-on-one chat too; saved people with no chat come last, by name. Each section opens as a
   preview of its most recent few people, with *Show all* on the section's header row.
   That way *Recent chats* is not buried under 163 saved contacts. An expanded section's
   header sticks to the top of the list while it scrolls, and the same control reads
   *Show less*, so collapsing is always one tap away.

   Everyone else is reachable through their groups only. A line under the search field
   says so. **Search in Contacts covers these two sections and nothing else.** A group
   member is found by opening the group, where the members screen has its own search.
   While searching, matches stay in their sections, which are shown in full with the
   match highlighted. A search with no match says that it covers only these two sections,
   and links to the Groups tab.
2. **Groups are ordered by recent activity**, the order of the Owner's own WhatsApp chat
   list. A group with no chat timestamp goes after the rest, smallest first. The Groups
   tab's search matches group names only. With no match, it says so, points to Contacts or
   a group's own search for finding a person, and links to Contacts.
3. **A group opens into its members.** Tapping a card opens a members screen with a
   checkbox per person, and the group's checkbox shows all, some or none. Filter chips
   split the members into *All*, *No name* and *Already on your list*, so the unnamed
   are one tap away in a large group. People with a name come first under *All*. The
   members screen's search matches name or number, the only way to find someone with no
   name. While searching, the chips count the matches and *select all* acts on the matches
   only. With no match, it says how many members were searched and that unnamed members
   are found by number.
   The guest-group mapping (`GroupCombobox`) stays on the group card.

   **A person is one selection wherever they appear**, matched by phone. The same person
   can be listed in Contacts and inside one or more groups, but ticking or unticking them
   in one place does the same everywhere else. A group's checkbox then shows *some*. A
   person picked through more than one group takes the guest group of the first group
   picked, as today. Someone picked from Contacts who is also in a picked group takes
   that group's guest group.
4. **Every person row shows their shared groups**, smallest group first, as many as fit,
   then `+N`. On the members screen this is left out, since the group is already known.
5. **People already on the guest list are marked**, matched by phone against
   `existingPhones`: "Already on your list" on a person, "N already guests" on a group card.
   They can't be selected, so duplicates no longer appear as errors in the validate step.
6. **Missing names are filled in during the pick step.** An unnamed person on the members
   screen gets an inline name field. Continuing with any unnamed people selected first
   shows a *Name N people* screen: one field per person, with their number and group,
   where the keyboard's Next key moves to the next field. The Owner can continue anyway.
   Those people are then skipped as today. The validate step's checks stay as the safety
   net, unchanged.
7. **Names the person chose themselves are shown as WhatsApp shows them**, with a leading
   `~`, so the Owner can tell them apart from names they saved.
8. **The wizard title names the source.** The WhatsApp flow is titled "Import from
   WhatsApp", not "Import guests from CSV".

The table handed to the validate step (`toWhatsAppImportTable`) keeps its shape. It gains
the names typed in the pick step and loses de-selected members and people already on the
list.

## Considered Options

- **Keep one flat Contacts list and only sort it better.** Rejected: even ranked well,
  1,500 rows of mostly strangers is a list nobody scrolls. People found through groups are
  better recognised in their group.
- **Search in Contacts across everyone read, group members included.** Rejected: results
  would bring the strangers back, and most group-only members have no name to search by.
  They are found in their group.
- **A third, collapsed *Everyone else* section in Contacts.** Rejected for the same
  reason: it is the flat list again, one tap away.
- **Drop the Contacts tab and import only by group.** Rejected: one-on-one contacts who
  share no group with the Owner (a parent's friend, a colleague) would be unreachable.
- **Expand group members inline in the Groups list.** Rejected: a 300-member group pushes
  every other group off the screen, and scrolling back out on a phone is unreliable.
- **Leave missing names to the validate step.** Rejected: that is what dropped 39% of the
  picked people in the first real run. The validate step's edit sheet carries every
  field, and one name each is all the Owner needs to type.
- **Keep sorting groups by size.** Rejected: size is the weakest signal of closeness.
  Wedding guests come from small family and friends groups.

## Consequences

- The service must keep the chat list from `messaging-history.set` (the chat id and its
  last-message timestamp), which it discards today. Only the ordering and the "has a
  one-on-one chat" flag reach the page, never message content.
- `WhatsAppPerson` gains a last one-on-one chat time and shared group ids. `WhatsAppGroup`
  gains a last activity time. The session row carries slightly more, still purged within
  15 minutes by the Sweeper.
- `WhatsAppPick` changes from whole groups to per-member selections, plus names typed in
  the pick step. Going back from validate still restores it.
- The Contacts count drops from ~1,566 to a few hundred for an account like the spike's,
  which reads as fewer contacts. The line under search explains it.
- One new screen (*Name N people*) between pick and validate. It appears only when unnamed
  people are selected.
- Someone the Owner neither saved nor chats with one-on-one can be picked only from a
  group, so the Owner has to know which group they are in. A person in no group and with
  no one-on-one chat cannot be picked at all. They would have had nothing but a number
  to recognise them by anyway.
- Hidden-ID one-on-one chats must be included in the batch phone lookup
  (`getPNsForLIDs`) that runs before the result is built. Today it covers only contacts and
  group participants, so a person the Owner chats with under a hidden ID could be missing
  from *Recent chats*. See Evidence.

## Evidence

A probe linked the same account as backlog 0017's spike on 2026-10-25, with the import's
own connection options (`syncFullHistory: false`). It printed counts only.

| Chats | Total | With a timestamp | < 7 days | < 30 days | < 1 year | Older |
|---|---|---|---|---|---|---|
| One-on-one, by phone | 458 | 458 | 7 | 10 | 84 | 357 |
| One-on-one, by hidden ID | 79 | 79 | 7 | 17 | 55 | 0 |
| Group | 97 | 97 | 10 | 1 | 18 | 68 |

- **Every chat carries a timestamp**, and all 89 groups matched a group chat. The 8 extra
  group chats are groups the Owner has left. Chats arrive in two sync batches,
  `INITIAL_BOOTSTRAP` (635) and `RECENT` (552), and the service already listens to both.
- **Recency separates well.** 10 groups were active in the last week and 68 not for over a
  year. Of 537 one-on-one chats, 41 were active in the last month.
- **Hidden-ID chats are the recent ones**: all 79 are under a year old, and only 15
  resolved to a phone from the sync's own mappings. The probe did not run the
  `getPNsForLIDs` lookup the service runs, so the real share is likely higher. It still
  has to be measured when this is built.

## Open

- Whether community announcement groups (`isCommunityAnnounce`) should be hidden. The
  probed account has no communities, so this is unverified. Hiding them when the flag is
  set costs one filter.
