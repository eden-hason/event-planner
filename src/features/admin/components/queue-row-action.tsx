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
import { Info, TriangleAlert } from 'lucide-react';
import { startCallRound } from '@/features/calls/actions/call-rounds';
import { triggerScheduleAdmin } from '@/features/schedules/actions/trigger-schedule';
import type { PlannedWorkRow } from '../types';

/**
 * Start and Send now both get their own confirmed click, and both dialogs lead
 * with the number of Guest Records affected.
 *
 * They are not the same kind of act and the copy says so: Start snapshots an
 * audience and is undoable by deleting the round, while Send now puts real
 * messages on real phones and cannot be taken back.
 */
export function QueueRowAction({ row }: { row: PlannedWorkRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const isCall = row.kind === 'call';

  function confirm() {
    startTransition(async () => {
      const result = isCall
        ? await startCallRound(row.id)
        : await triggerScheduleAdmin(row.id);

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
        variant={isCall ? 'default' : 'outline'}
        onClick={() => setOpen(true)}
        className="shrink-0 text-[13px] font-medium"
      >
        {isCall ? 'Start round' : 'Send now'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <AdminDialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{isCall ? 'Start this round?' : 'Send now?'}</DialogTitle>
            <DialogDescription>
              {isCall ? (
                <>
                  {row.audienceLabel} will be snapshotted into the round. Guests who confirm later
                  stay in the list with their current RSVP shown
                </>
              ) : (
                <>
                  {row.title} goes to {row.audienceLabel} over {row.channel ?? 'the message channel'}{' '}
                  immediately, and the schedule is marked sent. This action cannot be undone
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <p className="text-muted-foreground flex items-start gap-2 text-[12.5px]">
            {isCall ? (
              <>
                <Info className="mt-px size-3.5 shrink-0" />
                <span>Nobody is called yet. Deleting the round returns the plan to unstarted</span>
              </>
            ) : (
              <>
                <TriangleAlert className="text-destructive mt-px size-3.5 shrink-0" />
                <span>
                  Use this when cron did not run. Guests who already received this send are skipped
                </span>
              </>
            )}
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" onClick={confirm} disabled={pending}>
              {isCall ? 'Start round' : 'Send now'}
            </Button>
          </DialogFooter>
        </AdminDialogContent>
      </Dialog>
    </>
  );
}
