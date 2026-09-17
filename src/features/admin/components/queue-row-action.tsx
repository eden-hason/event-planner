'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AdminDialogContent } from './admin-dialog';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { startCallRound } from '@/features/calls/actions/call-rounds';
import type { PlannedWorkRow } from '../types';

export type QueueActionRow = Pick<
  PlannedWorkRow,
  'id' | 'kind' | 'title' | 'audienceLabel' | 'channel'
>;

/**
 * Starting a call round: one confirmed click, leading with the number of Guest
 * Records it affects.
 *
 * A message row renders no action at all. It used to offer "Send now" for when
 * cron did not run, and that button is gone with the cron it rescued: a
 * Schedule sends itself when its Due Time comes, and an overdue one is held,
 * expired or failed with a reason recorded on `schedule_dispatch_attempts`. The
 * Operator's job there is to read why, not to press send - and the Heartbeat,
 * not a person noticing a stale queue, is what catches the pipeline being down
 * (ADR 0013).
 *
 * So the queue now holds exactly one kind of action, which is the distinction
 * the list has always been trying to draw: work only a person can do.
 */
export function QueueRowAction({ row }: { row: QueueActionRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (row.kind !== 'call') return null;

  function confirm() {
    startTransition(async () => {
      const result = await startCallRound(row.id);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setOpen(false);

      // Starting a round is the beginning of an hour on the phone, so it lands
      // on the calling surface rather than dropping the Operator back onto a
      // queue the row has just disappeared from.
      if ('roundId' in result && result.roundId && result.eventId) {
        router.push(`/admin/events/${result.eventId}/rounds/${result.roundId}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        onClick={() => setOpen(true)}
        className="shrink-0 text-[13px] font-medium"
      >
        Start round
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <AdminDialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Start this round?</DialogTitle>
            <DialogDescription>
              {row.audienceLabel} will be snapshotted into the round. Guests who confirm later stay
              in the list with their current RSVP shown
            </DialogDescription>
          </DialogHeader>

          <p className="text-muted-foreground flex items-start gap-2 text-[12.5px]">
            <Info className="mt-px size-3.5 shrink-0" />
            <span>Nobody is called yet. Deleting the round returns the plan to unstarted</span>
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" onClick={confirm} disabled={pending}>
              Start round
            </Button>
          </DialogFooter>
        </AdminDialogContent>
      </Dialog>
    </>
  );
}
