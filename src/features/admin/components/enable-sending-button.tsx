'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { enableScheduleSending } from '../actions/events';

/**
 * The only way to open the sending gate from the Back Office. It sits inside
 * the outreach gate itself so the Operator acts where the blockage is stated.
 */
export function EnableSendingButton({ eventId }: { eventId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      className="shrink-0 text-[13px]"
      onClick={() =>
        startTransition(async () => {
          const result = await enableScheduleSending(eventId);
          if (result.success) toast.success(result.message);
          else toast.error(result.message);
        })
      }
    >
      {pending ? 'Enabling' : 'Enable sending'}
    </Button>
  );
}
