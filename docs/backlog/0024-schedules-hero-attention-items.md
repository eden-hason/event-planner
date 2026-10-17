# 0024 - The schedules hero leaves out three of its five attention items

Status: open

## The problem

The schedules hero (Claude Design project 20592c22, `Schedules Hero.dc.html`) has a
single attention line under the stepper. It shows the most urgent thing that needs the
Owner, plus a "+N" chip that opens the full list: a bottom sheet on mobile and a popover
on desktop. The design draws five kinds of item, most urgent first:

1. **No ask planned.** The invitation has no date yet (board 1c).
2. **Failed deliveries.** "2 messages were not delivered in the first reminder" (1d).
3. **Over the package.** "12 guests over the package won't get the next send" (1e).
4. **Added after a send.** "4 guests were added after the first invitation" (1f).
5. **Missing tables.** "12 guests still have no table before the table message" (1g).

The first version of the hero shipped with only 1 and 5, because the page already had the
data for them: `hasNoAskPlanned` and the per-Schedule `seatingGap`. With at most those
two, both can almost never fire together: 1 fires at the start of the plan and 5 at the
end. So the "+N" chip, the sheet and the popover were not built either.

## What is already in place

- `src/features/schedules/utils/hero.ts` is pure and tested. `HeroAttention` is a
  discriminated union and `attentionFor` decides priority by the order of its checks.
  Each new item is one more variant and one more check, plus a test in `hero.test.ts`.
- `schedules-hero.tsx` renders the row from `HeroAttention`. On desktop the row also shows
  a destination label (`go`). On mobile it shows only a chevron.
- The decided order (from the design's sheet, board 1i) is noAsk, failed, over-package,
  added-after, tables. Severity comes from the order, not the colour: every item gets the
  same quiet warning treatment.

## Each missing item

### Failed deliveries

- Count only **final** failures. A delivery that is still waiting on the Operator SMS
  fallback is not a failure yet (`sms_on_its_way` in `utils/schedule-results.ts`, ADR
  0011/0012). The design caption says this outright.
- The page has no per-Schedule count of final failures. `getSentCountByScheduleId` counts
  sends, so a sibling aggregate is needed, one round trip for the whole Event.
- The row links to that Schedule's Results tab, filtered to not delivered. The results
  filter is `useState` in `schedule-results.tsx`, so this needs a URL param (say
  `?schedule=<id>&tab=results&filter=not_delivered`). Without one the link can only land
  on the unfiltered tab.
- Open question: which sent Schedule does it name when several have failures? The most
  recent one, with the rest folded into +N, is the obvious reading.

### Over the package

- `splitByPackage` in `features/billing/utils/record-package.ts` already returns the
  records outside the package (ADR 0027). The item compares that set with the next send's
  audience.
- Show it to the Owner only, never to collaborators (design caption on 1e). Gate it the
  same way `useBillingSheet().canPrompt` does.
- The row links to `/app/<eventId>/package`.

### Added after a send

- Related to [0007](0007-send-to-guests-added-after-a-send.md): such a guest never gets the
  Schedule that already went out. `message_deliveries` records who was in the audience, so
  the count is the current target minus the delivery rows for that Schedule.
- **The design contradicts itself here. Settle this before building.** The 1f caption says
  "informational only, no promise of a send", but the row's tail says "· will get the
  reminder on 26.10". A promise is only true if the guest has a phone, is inside the
  package, and still matches the reminder's target on the day. Either drop the tail, or
  compute it from the same rules the Dispatcher applies.
- The row links to the details of the Schedule that went out.

### The +N list

- Build the mobile bottom sheet (board 1i): rows in priority order, each with a
  destination line and a link straight to the fix.
- Build the desktop popover from the same list (the desktop note in the design).
- Once there are two or more items, `HeroModel.attention` becomes a list rather than a
  single item.

## Done means

All five items fire from tested rules in `hero.ts`, each one links to where the Owner fixes
it, and "+N" opens the list on both platforms. The added-after copy promises nothing the
Dispatcher won't deliver.
