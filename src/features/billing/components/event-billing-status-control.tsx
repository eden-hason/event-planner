'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { setEventBillingStatus } from '../actions';
import { MANUAL_BILLING_STATUSES } from '../schemas';
import { BILLING_STATUS_LABELS as LABELS } from '../utils';
import type { EventBillingStatus } from '../types';

const CONSEQUENCE: Partial<Record<EventBillingStatus, string>> = {
  comped: 'Sending turns on for this event with no payment recorded',
  free: 'Sending turns off - the owner app hides all outreach again',
  canceled: 'Sending turns off - use this when a payment is refunded',
  payment_pending: 'No change to sending - marks that payment has started elsewhere',
};

/**
 * The manual half of "Free to Plan, Pay to Send" in the Back Office. Replaces
 * the old single "Enable sending" button: an operator can comp an event, revoke
 * it, or mark a payment in flight. A confirmed `paid` only ever comes from a
 * real payment, so it is not in the menu.
 */
export function EventBillingStatusControl({
  eventId,
  currentStatus,
}: {
  eventId: string;
  currentStatus: EventBillingStatus;
}) {
  const router = useRouter();
  const [target, setTarget] = useState<(typeof MANUAL_BILLING_STATUSES)[number] | null>(null);
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();

  function confirm() {
    if (!target) return;
    startTransition(async () => {
      const result = await setEventBillingStatus({
        eventId,
        toStatus: target,
        note: note.trim() || undefined,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setTarget(null);
      setNote('');
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="shrink-0 text-[13px]">
            Billing: {LABELS[currentStatus]}
            <ChevronDown className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {MANUAL_BILLING_STATUSES.filter((s) => s !== currentStatus).map((s) => (
            <DropdownMenuItem key={s} onSelect={() => setTarget(s)}>
              Set to {LABELS[s]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={target !== null} onOpenChange={(next) => !pending && !next && setTarget(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Set billing to {target ? LABELS[target] : ''}?</DialogTitle>
            <DialogDescription>
              {target ? (CONSEQUENCE[target] ?? 'Updates the billing status for this event') : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="billing-note" className="text-sm font-medium">
              Note (optional)
            </label>
            <Textarea
              id="billing-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why this event is being comped, who approved it, the invoice number"
              maxLength={500}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTarget(null)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" onClick={confirm} disabled={pending}>
              {pending ? 'Saving' : 'Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
