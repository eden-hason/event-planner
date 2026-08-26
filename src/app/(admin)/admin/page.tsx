import { Suspense } from 'react';
import {
  getOverviewStats,
  getSignals,
  getUpcomingEvents,
} from '@/features/admin/queries/overview';
import {
  StatCards,
  StatCardsError,
  StatCardsSkeleton,
} from '@/features/admin/components/stat-cards';
import {
  SignalList,
  SignalListError,
  SignalListSkeleton,
} from '@/features/admin/components/signal-list';
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
      <h1 className="text-lg font-semibold tracking-tight">Overview</h1>

      {/* Each band streams and fails on its own - one broken query must not take
          the page down or, worse, render as an all-clear. */}
      <Suspense fallback={<StatCardsSkeleton />}>
        <StatsBand />
      </Suspense>

      <Suspense fallback={<SignalListSkeleton />}>
        <SignalsBand />
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

async function SignalsBand() {
  try {
    return <SignalList signals={await getSignals()} />;
  } catch (error) {
    console.error('Overview signals failed:', error);
    return <SignalListError />;
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
