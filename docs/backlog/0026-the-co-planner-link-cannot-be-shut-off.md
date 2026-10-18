# The Co-planner Link cannot be shut off

Status: open

## The problem

ADR 0041 replaced email invitations with one **Co-planner Link** per Event. Whoever opens
it and signs in becomes an Owner. For the MVP it can be used by more than one person, never
expires, and cannot be reset, and there is no cap on Owners. That was a deliberate trade
for a flow that cannot fail, but it leaves the Event with no way to close the door:

- Anyone the link reaches gets full Owner access. That covers every Guest Record's phone
  number, the budget, payment and sending, and adding or removing Owners. A link
  forwarded once, or left in a group chat, stays live for good.
- Removing an Owner is cosmetic: they can open the same link and join again.
- Nothing tells the existing Owners that someone joined.

## Evidence

Before the change (2026-10-18), production had 7 co-Owners across 50 Events, and 15
invitations had ever been sent. Usage is small, so the exposure is small for now. It grows
with every link shared.

## Options already weighed (ADR 0041)

Roughly cheapest first:

1. **Reset link.** Any Owner can replace the link, and the old one stops working at once.
   People who already joined stay. This is the minimum that makes "Remove" real.
2. **Tell the Owners.** When someone joins, the other Owners see it on Home, or get a
   message.
3. **An Owner cap**, so the link stops working once the Event has N Owners. The old cap was
   2.
4. **An expiry**, renewed by an Owner. This brings back the "this link expired" dead ends
   that sank half the email invitations.
5. **Owner approval.** Opening the link only asks to join, and an existing Owner approves.
   It is the safest option, but the co-planner waits on someone.
6. **Phone confirmation.** The inviter names the co-planner's phone, and the joiner
   confirms a code sent to it. Rejected for the MVP because it adds a step.

## Unknown

- Whether a role short of full Owner is wanted after all. Seating Manager was removed
  because nobody ever used it, and avoiding "viewer"/"editor" is still the vocabulary rule
  in `CONTEXT.md`.
- Whether the link should be readable after it is created (shown again in the Collaborate
  tab) or shown once. The MVP shows it again.

## Done would mean

An Owner can stop an old Co-planner Link from working, a removed Owner cannot rejoin with
it, and the Owners can tell when someone new joined.
