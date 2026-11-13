# An Event on the current Message Plan offers no Catch-up Send

Status: open
Area: schedules / outreach
Related: `docs/adr/0050-a-catch-up-send-belongs-to-the-schedule.md`,
`docs/adr/0053-the-plan-is-invitation-follow-ups-reminder-thank-you.md`

## The problem

A Guest added after an Ask went out is offered that Ask as a Catch-up Send on the Classic
Message Plan. The first build of the current Message Plan leaves this out, so on those
Events a late Guest gets nothing until the next Follow-up.

## Evidence

Decided on 2026-11-12, to keep the pilot small. No Event is on the current plan yet.

## What is known

- The offer rule is already written for the new types in CONTEXT.md: the latest Ask that
  went out, the Invitation or the latest Follow-up.
- The Classic code finds the Schedule by type `initial_invitation` / `confirmation` and
  renders through the catalog (`services/catch-up-plan.ts`, `utils/catch-up.ts`). The
  current plan needs the "is an Ask" check and its code-defined messages instead.
- A Follow-up's wording ("still waiting") sent as a Guest's first message reads wrong.
  Whether a late Guest gets the Invitation's wording instead is not decided.

## Unknown

- How often it is missed during the pilot.

## Done means

An Owner and an Operator can make a Catch-up Send on an Event on the current Message Plan,
or it is decided those Events never have one.
