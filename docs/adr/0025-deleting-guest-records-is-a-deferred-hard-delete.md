# Deleting Guest Records is a deferred hard delete

The guest list is getting multi-select, and with it bulk delete. Its most common use is
"select all, delete" to redo a bad import. Deleting a Guest Record has always been a hard
delete: the row goes, and `message_deliveries`, `call_logs` and `guest_interactions`
cascade with it. That was tolerable one row at a time from a drawer. It is less
tolerable when one click can remove 300 records, some of which have already received
Deliveries, given an RSVP in a Confirmation Conversation, or sit at a Table.

We keep the hard delete and make it **deferred** rather than making it reversible in the
database. Once the Owner confirms, the rows disappear from the list right away, and an Undo
toast holds the delete for about eight seconds. The server delete only runs once the toast
expires. Undo cancels the delete before anything has been written, so it restores everything
exactly as it was, with the same ids, invitation tokens, Deliveries and Table Assignments.
The same flow covers deleting a single record, from the row menu or from the drawer.

A pending delete **commits when the Owner leaves**. Navigating within the app commits it
immediately, and closing or backgrounding the tab commits it on `pagehide` with a
fire-and-forget (`keepalive`) request to a route handler, since a Server Action cannot be
sent that way. If that request never arrives, the rows survive. That is the safe way to
fail: the Owner saw rows disappear that are still there, not the reverse.

The confirm dialog names what the delete takes with it ("8 of these have already received
messages", "3 answered themselves"). It says nothing about billing, on a paid Event or any other.
What a deleted record means for what the Owner paid is billing's question, and the guest
list page stays out of it entirely.

## Considered Options

- **Soft delete (`guests.deleted_at`).** This would keep history and allow restoring at any
  time. Rejected because it touches every guests query, every RLS policy, the audience a
  Schedule is sent to, seating, the Back Office writer (ADR 0007) and the unique phone
  constraint per Event. All of that would serve an archive nobody has asked to browse.
  It would also make "how many Guest Records does this Event have" a question with two
  answers.
- **Delete immediately, Undo re-inserts.** Simpler, because nothing waits in the browser.
  Rejected because the undo it gives is not a real undo: the cascaded Deliveries, Call
  Outcomes and Table Assignments are already gone, and re-inserted rows get new ids, which
  breaks `?guest=` links and invitation tokens a Guest may already hold.
- **Block bulk delete of records with history.** Rejected because redoing an import after
  the first Confirmation round is exactly the case the Owner needs, and a rule they can't
  see would feel like a bug.

## Consequences

- There is still no archive. An Owner who lets the toast expire has lost that history,
  and support cannot get it back.
- If a delete lands while a Delivery to that Guest is claimed and in flight (ADR 0014), the
  cascade removes the Delivery under the sender. This was already true of single deletes
  and is not made worse by this ADR, but bulk delete makes it more likely.
- An Operator deleting from the Back Office (ADR 0007) is still an immediate hard delete
  behind a confirm. This ADR covers the Owner's guest list only.
- Deleting a Group on mobile uses the same mechanism (`useDeferredCommit`): the same Undo
  window, commit on leave, and a `keepalive` route handler of its own (`groups/delete`).
  Undo matters less there, since a Group delete takes no Guest Records with it (their group
  is set to null), but one mechanism keeps the two from drifting.
