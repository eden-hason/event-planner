# A Test Message is always WhatsApp

Date: 2026-10-27

## Status

Accepted.

## Context

A **Test Message** copies the Event's earliest unsent Confirmation. That Schedule's template
can be an SMS one, and the test then went out as an SMS (backlog 0020). Nothing on the SMS
path knows a message was a test: its replies and statuses would be read as a Guest's. The
point of the test is also the WhatsApp conversation, which an SMS does not have.

## Decision

**A Test Message resolves the Schedule's template family on WhatsApp, whatever channel the
Schedule's own template is on.** It sends the WhatsApp member of the same family: same key,
Variant or Personal Message, language and configuration axes.

- When no WhatsApp member resolves, the send fails before a test is reserved, so it does not
  spend a Test Message.
- `test_messages` gets no `channel` column. The code path cannot send an SMS any more:
  `sendTestMessage` only posts a WhatsApp template. A column would record a value that can
  only ever be one thing.

## Considered Options

- **Skip to the earliest Confirmation with a WhatsApp template.** Rejected: it would preview
  a message other than the next one going out, and an Event whose Confirmations are all SMS
  would get no test at all.
- **Offer no Test Message for that Event.** Rejected: the test is now offered to every
  Owner, and SMS-first Events would quietly lose it.

## Consequences

- For an SMS-first Schedule, the test is the closest WhatsApp equivalent, not literally the
  bytes a Guest will get. CONTEXT.md says so.
- If a family ever exists on SMS only, its Event gets no test until a WhatsApp member is
  added. Home does not detect this ahead of time. The tap fails with "couldn't send" and no
  test is spent.
