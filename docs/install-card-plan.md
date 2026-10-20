# Install Card - build plan

Vocabulary: **Install Card**, **Featured Action**, **Visitor**, **Owner** (see `CONTEXT.md`).
Design: [`design/install-card-brief.md`](design/install-card-brief.md).
Branch: `claude/mobile-install-prompts-ab268d`.

Settled in a grilling session on 2026-10-19. Built on 2026-10-20 from `Install Card.dc.html`
(variant B: the "Add" pill centred, the ✕ in a small circle on the card's corner).

## Why

Most Owners plan from their phone, and every return trip goes through a browser tab, a
search or a WhatsApp link. Kululu already has a valid manifest and home-screen icons
(`src/app/manifest.ts`, `appleWebApp` in `src/app/layout.tsx`), but nothing tells an Owner
it can be installed. On top of that, today an installed icon opens the marketing page.

## What it is

The Install Card is an offer on Home to add Kululu to the phone's home screen. **It is not
a Featured Action.** ADR 0010 stays as it is: Featured Actions are computed and can't be
dismissed. The Install Card:

- sits above the ranked actions, in the same spot as the Visitor Save card, and takes none
  of the four slots. The two never show together, because Visitors don't get the Install
  Card
- can be dismissed, and the dismissal is remembered **on the device**, because being
  installed is a fact about the device, not about the Event or the Owner. Nothing is
  stored on the server, and there is no migration

## Who sees it

All of these must hold:

| Condition | Rule |
|---|---|
| Viewer | Signed in, not a Visitor. Anyone signed in who sees Home qualifies (Owner, co-planner, Seating Manager) |
| Not installed | Not running as the installed app: `matchMedia('(display-mode: standalone)')` is false, and on iOS `navigator.standalone` is not true |
| Not dismissed | No dismissal stored on this device |
| Platform | One of the two below |

**Android:** any browser that fires `beforeinstallprompt` (Chrome, Samsung Internet,
Edge). The card shows only while we hold that event. If the event never fires, which is
the case in Firefox, in-app browsers, and once the app is installed, the card never
shows.

**iPhone / iPad:** Safari or Chrome on iOS (both have Add to Home Screen since iOS 16.4),
**not** in an in-app browser. We detect in-app browsers by user agent (Instagram,
`FBAN`/`FBAV`, Line, and similar). iPadOS Safari reports a Mac user agent, so treat
`Macintosh` with `navigator.maxTouchPoints > 1` as iPad. Any other iOS browser (Firefox,
Edge, etc.) gets no card.

**Never:** desktop (the platform rules already exclude it), Firefox Android, in-app
browsers.

It shows from the **first Home visit**. There are no visit counters and no Event-state
conditions. On Android, though, Chrome decides when `beforeinstallprompt` fires: only after
the person has interacted with the site (a tap, and some time on the page). On a brand-new
phone the card may therefore appear partway through the first visit, or on the next one.

## Flows

### Android

1. A root-level listener catches `beforeinstallprompt`, calls `preventDefault()`, and
   keeps the event. This runs **site-wide**, so Chrome's own mini-infobar never shows
   anywhere, including the Guest RSVP pages (`/c`, `/confirm`, `/invitations`). Only the
   Install Card and the More row ever offer installing.
2. The card's "Add" calls `prompt()` on the event we kept, then reads `userChoice`.
3. **Accepted:** the card is gone for good. `appinstalled` also clears the event we kept,
   and the browser won't fire the event again.
4. **Cancelled:** the card hides for this visit only, because the event can be used once.
   It comes back if the browser fires `beforeinstallprompt` again on a later visit.
   Cancelling is **not** a dismissal.

### iPhone

1. The card's "Add" opens a bottom drawer (`src/components/ui/drawer.tsx`).
2. The drawer shows three numbered text steps, worded for the browser we detected (Safari or
   Chrome on iOS). They're plain text for now: an explanatory video is planned for above
   them, in place of the design's inline iOS glyph chips. Then one line saying that the first time they open the app they sign
   in with a WhatsApp code. On iOS the home-screen app keeps its own cookies and storage
   separate from Safari, so a signed-in Owner will see the sign-in screen once.
3. The drawer's single button, **"Done"**, counts as a dismissal. Swiping the drawer away
   or tapping outside just closes it, and the card stays.

Safari can never learn that the app was installed (the storage is separate), so on iPhone
the ✕ and Done are the only things that turn the card off.

### Dismissal

- ✕ on the card (both platforms), or Done in the iPhone drawer, hides the card **forever on
  this device**.
- Stored in `localStorage` under one key (e.g. `kululu:install-card-dismissed`, holding the
  ISO time). Every read and write goes through try/catch, and if storage is unavailable
  the card simply shows.
- Clearing site data brings it back. That's fine.

## The More page row

There's a permanent **"Add to home screen"** row on the mobile More page
(`src/components/layout/mobile-more-page.tsx`), in the Account group under Theme. It
**ignores the dismissal**, so a ✕ on Home is never a dead end:

- iOS: opens the same drawer. Done in the drawer from here also counts as a dismissal of
  the Home card, so there is still only one dismissal
- Android: opens the native dialog when we hold the event. When we don't, the row is
  hidden
- Hidden when running as the installed app, or on a platform that can't install

## Manifest

In `src/app/manifest.ts`:

- `start_url: '/app'` (was `'/'`). `/app` already sends a signed-in user to their last
  Event's Home, a Draft to `/start`, and a signed-out user to `/login` (via
  `src/lib/supabase/middleware.ts`)
- `id: '/'`. Without an `id`, Chrome derives the app's identity from `start_url`, so moving
  `start_url` would turn anyone who already installed into "not installed" and offer it
  again. Pinning `id` to the old value keeps the same identity
- `scope: '/'`, set explicitly

With no `description` or `screenshots`, Chrome shows its small install sheet. Making it the
larger sheet is deferred: [backlog 0028](backlog/0028-the-android-install-sheet-is-the-small-one.md).

## Analytics (PostHog)

Every event carries `platform` (`android` | `ios`) and `surface` (`home` | `more`).

| Event | When | Extra properties |
|---|---|---|
| `install_card_shown` | The card or More row first renders on a page | - |
| `install_card_tapped` | "Add" is tapped | - |
| `install_card_dismissed` | ✕ or Done | `via`: `x` \| `done` |
| `install_prompt_result` | Android `userChoice` resolves | `outcome`: `accepted` \| `dismissed` |

Plus a **`display_mode`** super property (`browser` | `standalone`), registered with
`posthog.register` in `instrumentation-client.ts`, so every event in the product tells
whether installed Owners come back more. `install_card_shown` fires at most once per page
view.

## Code

A new feature slice, **`src/features/install-app/`**:

- `utils/` - pure platform detection (`detectInstallPlatform(userAgent, maxTouchPoints)`
  returns `android-prompt` \| `ios-safari` \| `ios-chrome` \| `none`) and the in-app browser
  check. This is where the unit tests go (`*.test.ts`, user agent fixtures)
- the early capture of `beforeinstallprompt`. It has to be attached before hydration or
  the event can be missed. `instrumentation-client.ts` already runs before the app, so it
  can attach the listener and hand the event to a small module-level store that the hook
  subscribes to
- `hooks/` - `useInstallability(surface)`, the one place the rules live: whether to show
  (including the Visitor rule, and the More row ignoring the dismissal), what "Add" does
  per platform, the analytics, and the iOS drawer element for the surface to render
- `components/` - `InstallCard`, `InstallDrawer` (iOS steps), and `InstallMoreRow`, which
  takes the row itself as a render prop, so the More page draws it with its own
  `AccountRow`
- `index.ts` - the barrel: `InstallCard` and `InstallMoreRow`. Nothing here is server-only

Placement: `InstallCard` renders first inside `FeaturedActionList`
(`src/features/home/components/featured-action-list.tsx`), above the heading. The section
has no gap of its own around it: the card's bottom padding is the space, so it collapses
with the card. It is client-only, so it renders nothing on the server and
appears after mount. The design brief covers how it enters without jumping the list.

Copy goes in `messages/he.json` and `messages/en.json` under a new `installApp`
namespace. The proposed strings are in the design brief.

## Out of scope

- Push notifications, offline support, a service worker
- Desktop install (Chrome/Edge on desktop also fire `beforeinstallprompt`)
- Guiding in-app browser users to "open in Safari"
- Syncing dismissal across devices or storing it per account
- Carrying an iOS Safari session into the home-screen app (iOS doesn't allow it)
- Suggesting installation to Guests on RSVP pages

## To verify on real devices

- The exact Hebrew iOS labels ("הוספה למסך הבית", "הוסף") and where the Share button sits
  in iOS 26 Safari (compact layout puts it under "⋯")
- That iOS 26's "Open as Web App" toggle is on by default, so the icon opens standalone
- That Samsung Internet fires `beforeinstallprompt` with our manifest and no service worker
- That changing `start_url` with `id: '/'` doesn't make an existing Android install offer
  itself again
