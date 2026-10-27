# On one phone, every row of the Back Office events list opens the same Event

Status: open

## The problem

On one Operator's phone, tapping any row of `/admin/events` opens the same Event (call it
X), whatever row was tapped. It was noticed on a filtered list ("created this week"). On
other phones and laptops, each row opens its own Event.

A stopgap fix is on the branch `claude/backoffice-events-filter-bug-c6a118` (see below).
This item is for confirming the root cause on the real device and choosing the
implementation we want to keep for "the whole row opens the record" across the Back Office.

## The suspected root cause

Not confirmed on the device yet.

Before the fix, the row was made clickable with a "stretched link":
`src/features/admin/components/events-index.tsx` rendered
`<TableRow className="group relative">`, and the owner-name `<Link>` carried
`after:absolute after:inset-0`. The invisible `::after` layer is meant to fill its row, and
it needs the `<tr>` to be its containing block for that.

Some browser engines, older WebKit (iOS Safari) in particular, ignore `position: relative`
on table rows. The layer then fills the nearest positioned ancestor instead. That is the
shadcn table wrapper, `<div data-slot="table-container" className="relative ...">` in
`src/components/ui/table.tsx`. Every row's layer then covers the whole table, they stack in
DOM order, and the last row's layer is on top. So every tap opens the last row's Event.

This fits all the symptoms: one fixed Event for every tap, only on one device, and nothing
to do with the filter itself (the filter makes it noticeable because the list is short).
The unfiltered list should do the same on that phone, with the last row of the page.

## What is already known

- **The links are right.** Each row's `href` is `/admin/events/${row.id}`, rendered on the
  server. The filter, the router cache and the query are not involved.
- **The users list uses the same trick, but differently.** `users-index.tsx` puts `relative`
  on the first `<td>` as well, so its layer fills only the first cell, in every browser.
  It can never open the wrong user, but only the first cell is clickable.
- **No other table uses it.** A search for `after:inset-0` / `after:absolute` finds only
  these two rows. The other hits are tab underlines and the sidebar.
- **The stopgap.** A client component, `src/features/admin/components/linked-table-row.tsx`,
  handles `onClick` on the row and calls `router.push(href)`. It ignores clicks on links and
  buttons inside the row and clicks that end a text selection, and Cmd/Ctrl-click opens a
  new tab. The owner name stays a real `<Link>` for the keyboard and screen readers. Lint
  and the unit tests pass. It has not been tried on the failing phone.

## Better implementations to weigh

The stopgap works, but the row is not really a link. Long-pressing a cell other than the
name shows no link menu, middle-click on those cells does nothing, hovering shows no URL,
and the row does nothing until JavaScript has loaded.

1. **A link in every cell** to the same `href`. The first is the real one; the rest get
   `tabIndex={-1}` and `aria-hidden`. Each cell's padding moves onto its link (`block`),
   so the whole cell is the hit area. This is plain HTML and works in every engine and
   without JavaScript, with long-press and middle-click on every cell. The cost is one link
   per cell (8 per row on the events list) and padding moved off the `<td>`.
2. **Keep the stretched link, anchored to a cell.** Put `relative` on each `<td>` instead of
   the row. This only works with one overlay per cell, so it ends up as option 1.
3. **Rows that are not table rows.** Use CSS grid `div`s with `role="table"` / `row` /
   `cell`. A row is then an ordinary block, and a stretched link (or an `<a>` row) works
   everywhere. This is the biggest change, and table semantics have to be rebuilt by hand
   with ARIA.
4. **Ruled out: an `<a>` around the `<tr>`.** It is invalid HTML inside a table, and
   browsers move it out of the table when they parse the page.
5. **Not checked: forcing a containing block on the `<tr>`** with `transform` or
   `contain: layout`. It is unknown whether the old engines that ignore `relative` on rows
   honour these either. Test it on the failing engine before relying on it.

Whatever is chosen should be one shared row component used by both the events and users
lists, so the next Back Office table doesn't reinvent it.

## Still unknown

- The exact browser and version on the failing phone (iOS version, Safari or an in-app
  browser such as WhatsApp's).
- Whether X really is the last row on the page she was viewing. If it is, the root cause is
  confirmed. If not, the cause is something else and the stopgap may not help.
- Which engine version started treating `<tr>` as a containing block, so we know how many
  real users are affected. Check WebKit's release notes rather than memory.
- Whether the iOS Simulator with an older iOS runtime reproduces it. That would allow
  testing without the phone.

## Done would mean

The root cause is confirmed on the failing device (or a simulator matching it). One row
implementation is chosen and its reason written down (an ADR if it becomes the shared Back
Office pattern). The events and users lists both use it, every cell of a row opens that
row's record on the failing device, and keyboard, screen reader, long-press and
middle-click behaviour has been checked.
