import { Suspense } from 'react';
import { getPlannedWork, listEventsForPlanning } from '@/features/admin/queries/operations';
import { AddCallRoundDialog } from '@/features/admin/components/add-call-round-dialog';
import {
  PlannedWorkList,
  PlannedWorkError,
  PlannedWorkSkeleton,
} from '@/features/admin/components/planned-work-list';

// The Operator is here precisely because they need the current state. Never cached.
export const dynamic = 'force-dynamic';

export default function OperationsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-semibold tracking-tight">Operations</h1>
          <p className="text-muted-foreground text-[13px]">
            Every unsent message and unstarted call round, across all events
          </p>
        </div>

        <Suspense fallback={null}>
          <AddCallRoundBand />
        </Suspense>
      </div>

      <Suspense fallback={<PlannedWorkSkeleton />}>
        <QueueBand />
      </Suspense>
    </div>
  );
}

async function AddCallRoundBand() {
  try {
    return <AddCallRoundDialog events={await listEventsForPlanning()} />;
  } catch (error) {
    console.error('Event list for planning failed:', error);
    return null;
  }
}

async function QueueBand() {
  try {
    return <PlannedWorkList queue={await getPlannedWork()} />;
  } catch (error) {
    console.error('Operations queue failed:', error);
    return <PlannedWorkError />;
  }
}
