# Visitor sign-in - build notes

Implements [ADR 0028](adr/0028-a-visitor-plans-freely-and-saves-to-reach-out.md).
Vocabulary: **Visitor**, **saving** (see `CONTEXT.md`). Branch: `feat/visitor-signin`.

The first plan (sign-in at publish) was replaced on 2026-10-07: a Visitor now goes straight
into their workspace and saves whenever they choose. This file describes what is built.

## Database - `supabase/migrations/20261006000000_visitors.sql`

- `is_visitor()` reads the JWT's `is_anonymous` claim.
- **Profiles:** `profiles.is_visitor` is maintained by a trigger on `auth.users`. The row
  is created with the anonymous user, because the creator's collaborator row references
  `profiles`. Users can't write the column (grants are per column).
- **Closed to Visitors** (restrictive insert/update/delete): collaborators, invitations,
  guest scopes, the audit log, Test Messages, deliveries and attempts, billing events,
  WhatsApp import sessions, call rounds and logs, guest interactions, and the reference
  tables. Reads stay open.
- **Open to Visitors by decision:** `visitor_open_tables()`, which lists events, guests,
  groups, tables, expenses, gifts, schedules, profiles, and the internal tables that no
  `authenticated` role can reach anyway.
- **A Visitor's Event can never be `paid`** (trigger `refuse_paid_visitor_event`). Sending
  needs `paid`, and the Dispatcher runs as service role, so this is what keeps a Visitor's
  Event from sending.
- **`forget_visitor(uuid)`** deletes the Visitor's events first, then the user. Deleting
  the user alone fails on `event_collaborators_user_id_fkey`. It refuses anyone who isn't
  anonymous.
- **`purge_abandoned_visitors(limit)`** looks for 30 days with no change in the user or in
  any planning table under their events. The Sweeper runs it.
- **Guard:** `tables_undecided_for_visitors()` runs at the end of the migration and in
  `supabase/seeds/visitor-guard.sql` on every `db reset`.

## App

- **Becoming a Visitor:** `createDraftEvent` signs in anonymously on the first answer.
  `/start` has no session gate (neither the layout nor the middleware). The takeover
  publishes as before.
- **The user object:** `getCurrentUser` and `getEffectiveUser` return Visitors with
  `isVisitor: true`, and `getVisitorId` is the cheap check.
- **Saving:** `SaveEventProvider` in the event layout, with `SaveEventPill` in the page
  header at every width and at the top of Home on the phone. `SaveEventForm` asks for a
  name, then phone or Google. The actions are in `features/auth/actions/visitor.ts` and
  the cookies in `features/auth/services/visitor-session.ts`.
- **Existing accounts:** the phone check happens before any code is sent (`phone_exists`);
  Google comes back from the callback with `?save=exists`. Either way the Visitor chooses
  between a different number or account, and signing in while discarding the Event. The
  discard happens only after the sign-in succeeds, and a one-time dialog follows.
- **Server gates (`SAVE_REQUIRED`):** `createInvitation`, `executeSchedule`,
  `sendHomeTestMessage`, the WhatsApp import POST, plus RLS.
- **Client gates (`useSaveEvent().requireSaved` / `useSaveGatedClick`):** test message,
  invite link preview and share, guest RSVP link copy, send now, collaborator invite,
  WhatsApp import, and every WhatsApp "talk to us / add records" pay link.
- **Public links:** `/c/` and `/p/` show nothing for a Visitor's Event, except to the
  Visitor themselves.
- **`/login`:** a Visitor sees a warning that signing in discards their Event.
- **Back office:** Visitors are part of `getTestScope`, always hidden.

## Not verified yet

- Phone save end to end. Locally the `send-sms` hook has no `ACTIVE_TRAIL_API_KEY` in
  `supabase/functions/.env`.
- Google save and the Google existing-account round trip: how `linkIdentity` reports
  `identity_already_exists` to the callback.

## Rollout

1. Merge to `main`, then run `npm run db:push`. It's safe ahead of the deploy: the
   restrictive policies don't affect permanent users, and the profile trigger only fires
   for anonymous users.
2. Deploy.
3. In the prod dashboard: enable manual linking, set the anonymous rate limit, then
   enable anonymous sign-ins last.
