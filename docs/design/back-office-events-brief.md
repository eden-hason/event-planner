# Back Office Events

Implementation contract for `/admin/events` and `/admin/events/[eventId]`, based on the attached Back Office Events and Back Office Event design artboards.

## Events index

- Show published and draft Events, excluding test-account data from every count and row
- Business totals count published Events only and distinguish Guest Records (`guests` rows) from actual guests (`sum(guests.amount)`)
- Sort upcoming Events first by ascending date, then Past Events most-recent-first, then undated Events
- Use the subtitle `Upcoming first, with past and undated events grouped below`
- Support URL-backed `q`, `status=all|published|draft`, `setup=true`, and `page` filters
- Paginate at 50 records per page with Previous, Next, and a visible range/count
- `Needs setup` means, in priority order: sending not enabled; published Event without a guest list; sending enabled with a guest list but no schedules
- RSVP percentages and denominators use Guest Records. Show actual guests separately
- Empty copy is `Events appear here as soon as an owner starts onboarding`
- Draft rows state the last answered onboarding step factually
- Provide distinct loading, failed, filtered-empty, and true-empty states

## Event workspace

- Use the shell breadcrumb `Events / event`, and `Events / event / round` for a Call Round
- Keep Signals above the Event identity band; omit the band when there are none
- Use destructive styling only when overdue work or failed delivery exists; an open stale Call Round alone is neutral
- Signal links scroll to the actionable Send now, failure, or Complete round row
- Identity shows Event type, hosts, UTC-calendar Event date/countdown, venue, ceremony/reception times, owner, collaborators, and `/r/{shortCode}` Copy/Open guest page actions
- Draft Events render a compact identity plus one incomplete-onboarding explanation
- Guest List distinguishes Guest Records from actual guests, shows record-based RSVP totals and provenance, and lists groups/offline RSVP counts
- Phone quality uses the same `validatePhoneNumber()` function as sending. `List them` is an inline read-only disclosure of missing and invalid numbers
- Unpaid Events keep their guest list visible but replace outreach with: `Sending is not enabled for this event. Outreach remains unavailable until payment is completed and Kululu enables sending.`
- Paid Events with no guest list show `No guest list yet`; outreach explains that an eligible audience is required
- Render each data band behind an independent loading/error boundary

## Outreach timeline

- Label schedules from the catalog plus their position among all same-type Event schedules
- Display schedule instants in `Asia/Jerusalem`; display Event dates as UTC calendar dates
- Keep cancelled rows at their original planned date/time and say only `Cancelled by owner`
- Delivery history reflects persisted sent/failed rows only. Never derive skipped deliveries by comparing to today’s guest list
- A failure summary says `X of Y attempted deliveries failed`, where `Y` is persisted delivery rows
- Failures are preselected for resend. Operators may deliberately add successful deliveries after seeing a duplicate-send warning
- Selective resend is allowed only for sent message schedules and uses `claim: 'none'`, explicit guest ids, and `markSentOnSuccess: false`; upsert resolves the existing delivery row
- If delivery origins are mixed after resends, label the row `Includes manual resends`
- Add call round is hidden until sending is enabled and an eligible audience exists. Server Actions enforce the same rules
- Call Round progress uses its `call_logs` audience snapshot, not the Event’s current guest list
- Deleting a Call Round returns to its Event workspace; finish/reopen stay on the round

## Security and operations

- Every Back Office query and mutation calls `assertAdmin()` before constructing a service-role client
- `getTestScope()` enforces the same ordering itself
- Global search accepts a null Event date and renders `No date`
- No database migration is required
