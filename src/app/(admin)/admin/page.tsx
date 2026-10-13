import { Suspense } from 'react';
import {
  getOverviewStats,
  getUpcomingEvents,
} from '@/features/admin/queries/overview';
import { getOverviewCallRounds } from '@/features/admin/queries/operations';
import {
  StatCards,
  StatCardsError,
  StatCardsSkeleton,
} from '@/features/admin/components/stat-cards';
import {
  CallRounds,
  CallRoundsError,
  CallRoundsSkeleton,
} from '@/features/admin/components/call-rounds';
import {
  UpcomingEvents,
  UpcomingEventsError,
  UpcomingEventsSkeleton,
} from '@/features/admin/components/upcoming-events';

// The Operator is here precisely because they need the current state. Never cached.
export const dynamic = 'force-dynamic';

export default function OverviewPage() {
  // The date lives in the shell's top bar now, not here.
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-lg font-semibold tracking-tight">סקירה</h1>

      {/* Each band streams and fails on its own - one broken query must not take
          the page down or, worse, render as an all-clear. */}
      <Suspense fallback={<StatCardsSkeleton />}>
        <StatsBand />
      </Suspense>

      <Suspense fallback={<CallRoundsSkeleton />}>
        <CallRoundsBand />
      </Suspense>

      <Suspense fallback={<UpcomingEventsSkeleton />}>
        <UpcomingBand />
      </Suspense>
    </div>
  );
}

async function StatsBand() {
  try {
    return <StatCards stats={await getOverviewStats()} />;
  } catch (error) {
    console.error('Overview stats failed:', error);
    return <StatCardsError />;
  }
}

async function CallRoundsBand() {
  try {
    const { days, rounds } = await getOverviewCallRounds();
    return <CallRounds days={days} rounds={rounds} />;
  } catch (error) {
    console.error('Overview call rounds failed:', error);
    return <CallRoundsError />;
  }
}

async function UpcomingBand() {
  try {
    return <UpcomingEvents events={await getUpcomingEvents()} />;
  } catch (error) {
    console.error('Overview upcoming events failed:', error);
    return <UpcomingEventsError />;
  }
}
